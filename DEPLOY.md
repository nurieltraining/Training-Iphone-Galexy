# פרסום האפליקציה בכתובת HTTPS

כשהאפליקציה מוגשת ב-HTTPS, עובדים גם מצב לא מקוון והתקנה למסך הבית. יש שתי דרכים לפרסם אותה.

## דרך א: Netlify (הכי פשוט, בלי חשבון מתכנת)

1. נכנסים ל-https://app.netlify.com/drop.
2. גוררים לחלון את **התיקייה `app2`**. גוררים את התיקייה עצמה, לא את קובץ ה-zip.
3. אחרי כמה שניות מתקבלת כתובת כמו `https://xxxx.netlify.app`. אפשר לשנות את השם בהגדרות האתר.
4. בכל עדכון גוררים שוב את `app2`, באותו מסך של אותו אתר (Deploys > drag and drop).

## דרך ב: GitHub Pages (עם היסטוריית גרסאות)

התיקייה כבר מוכנה כמאגר Git, וקובץ הפרסום `.github/workflows/pages.yml` כבר בפנים.

1. פותחים מאגר חדש ב-GitHub, למשל `lomdim-bekalut`.
2. בתיקיית הפרויקט מריצים:
   ```
   git remote add origin https://github.com/<שם-המשתמש>/lomdim-bekalut.git
   git push -u origin main
   ```
3. ב-GitHub נכנסים ל-**Settings > Pages**, וב-**Source** בוחרים **GitHub Actions**.
4. אחרי דקה-שתיים האתר זמין בכתובת `https://<שם-המשתמש>.github.io/lomdim-bekalut/`.

## לפני כל פרסום של עדכון

1. מריצים:
   ```
   python tools/check_content.py
   ```
   צריך לקבל 0 שגיאות.
2. אם עדכנתם שיעורים, מריצים:
   ```
   python tools/build_search_index.py
   ```
3. מעלים את מספר הגרסה בשני קבצים:
   - ב-`app2/index.html` וב-`app2/sw.js`: מחליפים `?v=26` ב-`?v=27`.
   - ב-`app2/sw.js`: מעדכנים גם את `CACHE_VERSION`.
4. שומרים גרסה ב-Git:
   ```
   git add -A
   git commit -m "תיאור השינוי"
   ```
