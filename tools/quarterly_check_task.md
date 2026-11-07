# משימה רבעונית: בדיקת עדכניות התוכן

**תזמון:** ב-1 לפברואר, מאי, אוגוסט ונובמבר, בשעה 09:00. ב-cron: `0 9 1 2,5,8,11 *`.

**איך להפעיל:** מבקשים מ-Claude: "צור משימה מתוזמנת רבעונית לפי הקובץ tools/quarterly_check_task.md", ומאשרים את הבקשה כשהיא מופיעה. אפשר גם פשוט להדביק את הפרומפט שלמטה בצ'אט, פעם בשלושה חודשים.

## הפרומפט (באנגלית - זה הנוסח שהמשימה מריצה)

You are checking the content of the Hebrew smartphone-learning web app "לומדים בקלות" for older adults. Project folder: C:\Users\Nuriel Avrahami\Desktop\אפליקציה להכרת טלפון חכם (app in app2; lessons app2/data/lessons/*.json, quizzes app2/data/quizzes/*.json; courses iPhone, Galaxy, Xiaomi; tools in tools).
Do NOT change app files - only write a report:
1. Run `python tools/check_content.py --details` and note errors and warnings, especially lessons not reviewed in 90 days.
2. Verify with web searches the 10 most time-sensitive facts (OS menu paths for iOS / One UI / HyperOS; WhatsApp, Google Maps, Waze, Gmail, Instagram, Zoom features and limits; Bit/PayBox fees; health-fund and gov.il login; Home Front Command alerts; Israeli emergency numbers; consumer-protection rules). Prefer official sources.
3. Write a Hebrew report to בדיקה_רבעונית_YYYY-MM-DD.md in the project folder: summary; table of outdated facts (file, step, current text, correct now, source link); confirmed facts; checker counts.
4. Tell the user in 3-5 Hebrew lines how many issues were found and that Claude can apply the fixes (all three courses, set "reviewed" to today, run tools/build_search_index.py, bump ?v= and CACHE_VERSION, repackage).
