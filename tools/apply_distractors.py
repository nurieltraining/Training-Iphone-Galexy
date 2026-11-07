"""apply_distractors.py - apply the rewritten quiz answers in
tools/distractors_*.json to every quiz file (all three courses).

Mapping format: { "<question text>": { "<old answer>": "<new answer>" } }
Rewrites:
  - weak wrong answers ("אין דרך...", "אי אפשר...") -> believable mistakes
  - correct answers that were much longer than the others -> shortened, so
    the right answer can't be spotted by its length alone.
The correct-answer index is never changed. Safe to re-run."""
import glob
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
QUIZ = os.path.join(HERE, "..", "app2", "data", "quizzes")

mapping = {}
for f in sorted(glob.glob(os.path.join(HERE, "distractors_*.json"))):
    with open(f, encoding="utf-8") as fh:
        for q, repl in json.load(fh).items():
            mapping.setdefault(q, {}).update(repl)

used = set()
changed_answers = 0
problems = []
for p in sorted(glob.glob(os.path.join(QUIZ, "*.json"))):
    with open(p, encoding="utf-8") as fh:
        d = json.load(fh)
    dirty = False
    for q in d["questions"]:
        repl = mapping.get(q["question"])
        if not repl:
            continue
        used.add(q["question"])
        new = [repl.get(a, a) for a in q["answers"]]
        if len(set(new)) != len(new):
            problems.append("%s: duplicate answers after rewrite: %s" % (os.path.basename(p), q["question"]))
            continue
        changed_answers += sum(1 for a, b in zip(q["answers"], new) if a != b)
        if new != q["answers"]:
            q["answers"] = new
            dirty = True
    if dirty:
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)
            fh.write("\n")

unused = [q for q in mapping if q not in used]
print("answers rewritten: %d" % changed_answers)
print("questions in mapping not found in any quiz: %d" % len(unused))
for q in unused:
    print("   ?", q)
for x in problems:
    print("   !", x)
sys.exit(1 if problems else 0)
