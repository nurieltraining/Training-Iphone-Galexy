"""fix_content_v24.py - quiz audit (all 227 unique questions read against the
lessons) + safety/Waze lesson updates, 2026-11-07. Safe to re-run."""
import glob
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app2", "data")
log = []


def files(pattern):
    return sorted(glob.glob(os.path.join(DATA, pattern)))


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write("\n")


def quiz(label, pattern, q_contains, correct=None, explanation=None, question=None):
    n = 0
    for p in files(pattern):
        d = load(p)
        hit = False
        for q in d["questions"]:
            if q_contains in q["question"]:
                if correct:
                    q["answers"][q["correct"]] = correct
                if explanation:
                    q["explanation"] = explanation
                if question:
                    q["question"] = question
                hit = True
        if hit:
            save(p, d)
            n += 1
    log.append((label, n))


def step_by_title(label, pattern, title_contains, text):
    n = 0
    for p in files(pattern):
        d = load(p)
        for s in d["steps"]:
            if title_contains in s["title"]:
                s["text"] = text
                n += 1
        save(p, d)
    log.append((label, n))


# --- quiz answers that were wrong or outdated
quiz("אינסטגרם: עד 20 תמונות", "quizzes/quiz*instagram.json", "כמה תמונות יחד לפוסט אחד",
     correct="אפשר לבחור עד 20 תמונות באותו פוסט (קרוסלה)",
     explanation="אינסטגרם מאפשרת עד 20 תמונות או סרטונים בפוסט אחד, שעוברים ביניהם בהחלקה.")
quiz("תרגום: בדיקה הפוכה בלי שם תפריט שלא קיים", "quizzes/quiz*translate.json", "המשמעות המקורית נשמרה",
     correct="מתרגמים את התוצאה בחזרה לשפה המקורית ובודקים",
     explanation="החלפת השפות ותרגום התוצאה בחזרה מראה אם המשמעות נשמרה.")
quiz("בטיחות: חבילה תקועה - לא לוחצים בכלל", "quizzes/quiz*safety.json", "תקועה במכס",
     correct="לא ללחוץ, ולבדוק את המשלוח באתר הרשמי של דואר ישראל או חברת השילוח",
     explanation="הודעות 'חבילה תקועה' הן מההונאות הנפוצות בישראל. לא לוחצים על הקישור - נכנסים בעצמכם לאתר הרשמי ובודקים לפי מספר המשלוח.")
quiz("בטיחות: סימן לאתר מאובטח - Chrome כבר לא מציג מנעול", "quizzes/quiz*safety.json", "מהו הסימן שכדאי לחפש",
     correct="כתובת שמתחילה ב-https, בלי אזהרת 'לא מאובטח', ושם האתר נכון",
     explanation="חיבור מוצפן (https) הוא תנאי הכרחי אבל לא מספיק. Chrome כבר לא מציג מנעול - הוא מזהיר רק כשהאתר 'לא מאובטח'. הכי חשוב: לבדוק שהשם בכתובת הוא בדיוק של האתר הנכון.")
quiz("Waze: חיפוש תחנת דלק", "quizzes/quiz*waze.json", "תחנת דלק קרובה",
     correct="מחפשים 'תחנות דלק' בחיפוש של Waze ובוחרים אחת בדרך")
quiz("אנשי קשר (אייפון): העברה דרך iCloud", "quizzes/quiz_contacts.json", "שכל אנשי הקשר יעברו אוטומטית",
     correct="מסנכרנים את אנשי הקשר ל-iCloud (או לחשבון גוגל)",
     explanation="כשאנשי הקשר מסונכרנים ל-iCloud או לגוגל, הם מופיעים אוטומטית במכשיר החדש אחרי ההתחברות לאותו חשבון.")
quiz("מצלמה (אנדרואיד): ניקוי עדשה בלי להבטיח התראה", "quizzes/quiz_[gx]*_camera.json", "יוצאות מטושטשות",
     correct="שהעדשה נקייה - טביעת אצבע על העדשה מטשטשת תמונות",
     explanation="הסיבה הנפוצה ביותר לתמונות מטושטשות היא עדשה מלוכלכת. מנגבים בעדינות במטלית רכה.")

# --- lessons behind those answers
LOCK = ("לפני שמזינים פרטים אישיים או פרטי אשראי באתר, בדקו את הכתובת בחלק העליון של הדפדפן > היא צריכה להתחיל ב-https "
        "(החיבור מוצפן), ואסור שתופיע אזהרה 'לא מאובטח' > שימו לב: Chrome כבר לא מציג סמל מנעול, אלא מזהיר רק כשהאתר לא מאובטח > "
        "חיבור מוצפן לבדו אינו מבטיח שהאתר אמין - גם אתרי הונאה מוצפנים. הכי חשוב לבדוק שהשם בכתובת הוא בדיוק של האתר הנכון.")
step_by_title("בטיחות: שיעור 'אתר מאובטח' - בלי להסתמך על מנעול", "lessons/lesson*_safety.json", "אתר מאובטח", LOCK)
step_by_title("בטיחות: שיעור 'אתר מאובטח' (אייפון)", "lessons/lesson_safety.json", "אתר מאובטח", LOCK)
GAS = ("במהלך ניווט, לחצו על שורת החיפוש (או על 'הוספת עצירה') > בחרו בקטגוריה 'תחנות דלק' > Waze יציג תחנות קרובות לאורך המסלול, "
       "לעיתים עם מחירים > בחרו תחנה ולחצו 'הוספת עצירה' כדי לעצור בה בדרך. המיקום המדויק של הכפתורים משתנה מעט בין גרסאות.")
step_by_title("Waze: מציאת תחנת דלק", "lessons/lesson*waze.json", "תחנת דלק", GAS)

for label, n in log:
    print("%-4s %-60s %d" % ("OK" if n else "??", label, n))
