# פרסום האפליקציה

האפליקציה **כבר מפורסמת ב-HTTPS** דרך GitHub Pages, מהמאגר
https://github.com/nurieltraining/Training-Iphone-Galexy

**כתובת האפליקציה:** https://nurieltraining.github.io/Training-Iphone-Galexy/app2/

- **ההגדרה הנוכחית:** ב-Settings > Pages מוגדר "Deploy from a branch", ענף `main`, תיקייה `/ (root)`. אין לשנות אותה, כי שינוי יזיז את האתר לכתובת אחרת, והקישורים וההתקנות הקיימות אצל המשתמשים יישברו.
- **מצב לא מקוון והתקנה למסך הבית:** עובדים בכתובת הזו, כי היא HTTPS.

## איך מעדכנים את האתר

1. מריצים:
   ```
   python tools/check_content.py
   ```
   צריך לקבל 0 שגיאות.
2. אם שיניתם שיעורים, מריצים:
   ```
   python tools/build_search_index.py
   ```
3. מעלים את מספר הגרסה בשני קבצים:
   - ב-`app2/index.html` וב-`app2/sw.js`: מחליפים `?v=27` ב-`?v=28`.
   - ב-`app2/sw.js`: מעדכנים גם את `CACHE_VERSION`.
4. שומרים ומעלים:
   ```
   git add -A
   git commit -m "תיאור השינוי"
   git push
   ```
5. אחרי 1-3 דקות האתר מתעדכן. את ההתקדמות רואים ב-GitHub, בלשונית **Actions**, בריצה בשם "pages build and deployment".

**חשוב:** לא מעלים קבצים בגרירה לאתר GitHub. מעלים רק עם `git push`, כדי שההיסטוריה תישמר.

## חלופה: Netlify

אפשר לפרסם עותק נוסף בכתובת אחרת: נכנסים ל-https://app.netlify.com/drop וגוררים את התיקייה `app2`. בדרך כלל אין בזה צורך.
