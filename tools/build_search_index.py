"""build_search_index.py - regenerate app2/data/search-index.json from the
lesson files. Run after ANY lesson edit, otherwise search shows stale text:
    python tools/build_search_index.py

Each step gets: catId, course, catTitle, stepIndex, title, snippet (the full
step text + warning, so search finds words anywhere in the step, not only in
its first 80 characters as before)."""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app2", "data")

with open(os.path.join(DATA, "categories.json"), encoding="utf-8") as f:
    cats = json.load(f)["categories"]

index = []
for cat in cats:
    with open(os.path.join(DATA, cat["lessonFile"]), encoding="utf-8") as f:
        lesson = json.load(f)
    for i, s in enumerate(lesson["steps"]):
        text = " ".join(x for x in (s.get("text"), s.get("warning")) if x)
        index.append({
            "catId": cat["id"],
            "course": cat["course"],
            "catTitle": cat["title"],
            "stepIndex": i,
            "title": s["title"],
            "snippet": " ".join(text.split()),
        })

out = os.path.join(DATA, "search-index.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
print("search-index.json: %d entries, %d KB" % (len(index), os.path.getsize(out) // 1024))
