"""check_content.py - automated sanity checks for the app's lesson/quiz data.

Run from the project folder:
    python tools/check_content.py            (prints a summary)
    python tools/check_content.py --details  (lists every finding)

Errors (exit code 1) = things that break the app or are certainly wrong.
Warnings = things a person should look at (wrong-platform wording, quiz
answers that give themselves away, etc.).
"""
import json
import os
import re
import sys
import datetime
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app2")
DATA = os.path.join(ROOT, "data")

# Wording that belongs to one platform only. Android courses that say
# "App Store" (etc.) were probably copied from the iPhone course and not
# adapted. Some hits are legitimate comparisons - review, don't auto-fix.
IPHONE_ONLY = ["App Store", "אפ סטור", "אייפון", "iPhone", "Face ID", "iCloud", "סרט הצילום", "Siri", "סירי", "AirDrop", "FaceTime"]
ANDROID_ONLY = ["Google Play", "גוגל פליי", "Play Store", "חנות Play", "אנדרואיד", "Android", "סמסונג", "Samsung", "שיאומי", "Xiaomi", "גלקסי", "Galaxy", "HyperOS", "MIUI"]
WEAK_DISTRACTOR = re.compile(r"^(אין דרך|אי אפשר|זה בלתי אפשרי|צריך לזכור בעל פה|לא צריך לעשות כלום|אין צורך|אין אפשרות)")

errors, warnings = [], []
STALE_DAYS = 90  # apps change their screens often - re-check every quarter


def err(where, msg):
    errors.append((where, msg))


def warn(kind, where, msg):
    warnings.append((kind, where, msg))


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        err(path, "JSON לא תקין: %s" % e)
        return None


def main():
    details = "--details" in sys.argv
    cats = load(os.path.join(DATA, "categories.json"))
    if not cats:
        return report(details)
    course_ids = {c["id"] for c in cats["courses"]}
    seen_ids = set()
    pos = Counter()
    longest = Counter()

    for cat in cats["categories"]:
        cid = cat.get("id")
        if cid in seen_ids:
            err(cid, "מזהה קטגוריה כפול")
        seen_ids.add(cid)
        if cat.get("course") not in course_ids:
            err(cid, "קורס לא מוכר: %s" % cat.get("course"))
        if cat.get("image") and not os.path.exists(os.path.join(ROOT, cat["image"])):
            err(cid, "תמונה חסרה: %s" % cat["image"])

        lesson = load(os.path.join(DATA, cat["lessonFile"]))
        if lesson:
            rev = lesson.get("reviewed")
            try:
                age = (datetime.date.today() - datetime.date.fromisoformat(rev)).days if rev else None
            except ValueError:
                age = None
            if age is None or age > STALE_DAYS:
                warn("לא נבדק מול המסכים ב-%d הימים האחרונים" % STALE_DAYS, cid,
                     "נבדק לאחרונה: %s" % (rev or "אף פעם"))
            steps = lesson.get("steps", [])
            if len(steps) != cat.get("stepCount"):
                err(cid, "stepCount=%s אבל בשיעור יש %d שלבים" % (cat.get("stepCount"), len(steps)))
            titles = Counter(s.get("title", "").strip() for s in steps)
            for t, n in titles.items():
                if n > 1:
                    warn("כותרת שלב כפולה", cid, t)
            for i, s in enumerate(steps):
                if not s.get("title") or not s.get("text"):
                    err(cid, "שלב %d ללא כותרת/טקסט" % (i + 1))
                blob = " ".join(str(s.get(k) or "") for k in ("title", "text", "warning"))
                bad = IPHONE_ONLY if cat["course"] != "iphone" else ANDROID_ONLY
                for w in bad:
                    if w.lower() in blob.lower():
                        warn("מונח של פלטפורמה אחרת", cid, "שלב %d: '%s' - %s" % (i + 1, w, s.get("title")))

        if not cat.get("quizFile"):
            continue
        quiz = load(os.path.join(DATA, cat["quizFile"]))
        if not quiz:
            continue
        for qi, q in enumerate(quiz.get("questions", [])):
            where = "%s שאלה %d" % (cid, qi + 1)
            ans = q.get("answers", [])
            c = q.get("correct")
            if not isinstance(c, int) or not (0 <= c < len(ans)):
                err(where, "אינדקס תשובה נכונה לא תקין: %r" % c)
                continue
            if len(ans) < 3:
                warn("מעט מדי תשובות", where, "%d תשובות" % len(ans))
            if len({a.strip() for a in ans}) != len(ans):
                err(where, "תשובות כפולות")
            if not q.get("explanation"):
                warn("חסר הסבר", where, q.get("question", ""))
            pos[c] += 1
            lens = [len(a) for a in ans]
            others = [l for i, l in enumerate(lens) if i != c]
            if lens[c] == max(lens):
                longest["correct"] += 1
                if others and lens[c] > 1.6 * max(others):
                    warn("התשובה הנכונה ארוכה בבירור", where, ans[c])
            else:
                longest["other"] += 1
            for i, a in enumerate(ans):
                if i != c and WEAK_DISTRACTOR.search(a.strip()):
                    warn("מסיח חלש ('אין דרך...')", where, a)

    # search index points at real categories
    idx = load(os.path.join(DATA, "search-index.json")) or []
    for e in idx:
        if e.get("catId") not in seen_ids:
            err("search-index", "מפנה לקטגוריה שלא קיימת: %s" % e.get("catId"))

    total_q = sum(pos.values())
    print("קטגוריות: %d | שאלות: %d" % (len(seen_ids), total_q))
    if total_q:
        print("מיקום התשובה הנכונה בקבצים: %s (האפליקציה מערבבת בזמן ריצה)" % dict(sorted(pos.items())))
        print("התשובה הנכונה היא הארוכה ביותר ב-%d%% מהשאלות" % round(100 * longest["correct"] / total_q))
    return report(details)


def report(details):
    print("\nשגיאות: %d" % len(errors))
    for where, msg in errors:
        print("  ✗ %s: %s" % (where, msg))
    by_kind = defaultdict(list)
    for kind, where, msg in warnings:
        by_kind[kind].append((where, msg))
    print("אזהרות: %d" % len(warnings))
    for kind, items in sorted(by_kind.items(), key=lambda kv: -len(kv[1])):
        print("  • %s: %d" % (kind, len(items)))
        if details:
            for where, msg in items:
                print("      - %s: %s" % (where, msg))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
