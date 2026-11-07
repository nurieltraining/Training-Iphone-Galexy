"""fix_content_v22.py - one-off content corrections after source verification
(2026-11-07). Each fix is an exact-substring replacement; the script reports
how many files each fix touched so nothing silently fails. Safe to re-run
(already-applied fixes simply match 0 files). Sources: see BEDIKA_V22.md."""
import glob
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app2", "data")
REVIEWED = "2026-11-07"


def files(pattern):
    return sorted(glob.glob(os.path.join(DATA, pattern)))


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write("\n")


def walk_replace(obj, old, new):
    """Replace substring in every string inside obj. Returns (obj, count)."""
    n = 0
    if isinstance(obj, str):
        if old in obj:
            return obj.replace(old, new), obj.count(old)
        return obj, 0
    if isinstance(obj, list):
        out = []
        for x in obj:
            x, k = walk_replace(x, old, new)
            n += k
            out.append(x)
        return out, n
    if isinstance(obj, dict):
        out = {}
        for key, x in obj.items():
            x, k = walk_replace(x, old, new)
            n += k
            out[key] = x
        return out, n
    return obj, 0


log = []


def fix(label, pattern, old, new, expect=None):
    touched = 0
    for p in files(pattern):
        d = load(p)
        d, k = walk_replace(d, old, new)
        if k:
            save(p, d)
            touched += 1
    status = "OK" if (expect is None and touched) or touched == expect else "CHECK"
    log.append((status, label, touched))


def set_step(label, pattern, title_contains, text=None, title=None, warning=False, warning_text=None):
    touched = 0
    for p in files(pattern):
        d = load(p)
        for s in d["steps"]:
            if title_contains in s["title"]:
                if text is not None:
                    s["text"] = text
                if title is not None:
                    s["title"] = title
                if warning:
                    s["warning"] = warning_text
                touched += 1
        if touched:
            save(p, d)
    log.append(("OK" if touched else "CHECK", label, touched))


def set_quiz(label, pattern, q_contains, answer_old=None, answer_new=None, explanation=None, question=None):
    touched = 0
    for p in files(pattern):
        d = load(p)
        hit = False
        for q in d["questions"]:
            if q_contains in q["question"]:
                if answer_old is not None:
                    q["answers"] = [answer_new if a == answer_old else a for a in q["answers"]]
                if explanation is not None:
                    q["explanation"] = explanation
                if question is not None:
                    q["question"] = question
                hit = True
        if hit:
            save(p, d)
            touched += 1
    log.append(("OK" if touched else "CHECK", label, touched))


ALL = "lessons/lesson_%s.json"
ALLQ = "quizzes/quiz_%s.json"


def three(topic, prefix="lessons/lesson_", suffix=".json"):
    return "%s*%s%s" % (prefix, topic, suffix)


# ---------------------------------------------------------------- emergency
fix("חירום: אפליקציית פיקוד העורף - הסרת '3-5 דקות' המובטחות", "lessons/lesson*emergency.json",
    "זה נותן זמן התרעה נוסף של 3-5 דקות לפני האזעקה, וגם מציג הנחיות מדויקות למרחב המוגן הקרוב אליכם.",
    "האפליקציה מציגה התרעות והנחיות לפי האזור שלכם, ובחלק מהמקרים גם 'הנחיה מקדימה' כמה דקות לפני אזעקה. שימו לב: הנחיה מקדימה לא מגיעה תמיד, ולפעמים אזעקה מופעלת בלעדיה - היא לא מחליפה את האזעקה.", 3)
fix("חירום: הסבר בחידון על פיקוד העורף", "quizzes/quiz*emergency.json",
    "מוסיפה 3-5 דקות התרעה נוספות והנחיות מדויקות למרחב המוגן.",
    "מציגה התרעות והנחיות לפי אזור, ולעיתים גם הנחיה מקדימה לפני אזעקה.", 3)
fix("חירום: הוספת ער\"ן 1201 ומוקד 105", "lessons/lesson*emergency.json",
    "1220 - זק\"א, איתור וחילוץ נעדרים.",
    "1220 - זק\"א, איתור וחילוץ נעדרים > 1201 - ער\"ן, עזרה ראשונה נפשית בטלפון, 24 שעות ביממה > 105 - המוקד הלאומי להגנה על ילדים ובני נוער ברשת.", 3)
fix("חירום (אייפון): שם ההגדרה של 5 לחיצות", "lessons/lesson_emergency.json",
    "'הגדרות' > 'שיחת חירום' > הפעילו 'חיוג בלחיצה על כפתור הצד'.",
    "'הגדרות' > 'חירום SOS' > הפעילו 'חיוג עם 5 לחיצות על הכפתור' (Call with 5 Button Presses).", 1)
fix("חירום (אייפון): וואטסאפ באייפון משתמש ב-'+' ולא באטב", "lessons/lesson_emergency.json",
    "לחצו על סמל האטב (📎) > 'מיקום'",
    "לחצו על ה-'+' ליד תיבת ההקלדה > 'מיקום'", 1)

# ---------------------------------------------------------------- money
FEE_TEXT = ("ב-Bit יש עמלה על קבלת כספים - רק למי שמקבל מעל 25,000 ש״ח בשנה קלנדרית, ורק על הסכום שמעבר לתקרה "
            "(0.6% מ-2025, ו-0.8% החל ממאי 2026) > ב-PayBox התנאים שונים ותלויים במסלול: במסלול הבסיסי אפשר לקבל עד "
            "50,000 ש״ח בשנה ללא עמלה > עבור רוב המשתמשים הפרטיים שמעבירים סכומים קטנים בין חברים ומשפחה, השימוש נשאר ללא עמלה.")
set_step("כסף: עמלות Bit/PayBox (תוקן לפי פרסומי 2026)", "lessons/lesson*money.json", "שמים לב לעמלות", text=FEE_TEXT)
set_quiz("כסף: שאלת העמלות בחידון", "quizzes/quiz*money.json", "עמלה על שימוש ב-Bit/PayBox",
         answer_old="לא - עמלה חלה רק מעל 25,000 ש״ח שהתקבלו בשנה, ורק על העודף מעבר לתקרה",
         answer_new="לא - ב-Bit עמלה חלה רק על מי שמקבל מעל 25,000 ש״ח בשנה, ורק על העודף",
         question="האם יש עמלה על העברות קטנות בין חברים ב-Bit או ב-PayBox?",
         explanation="ב-Bit העמלה חלה רק על העודף מעל 25,000 ש״ח שהתקבלו בשנה, וב-PayBox התקרה במסלול הבסיסי גבוהה יותר. רוב המשתמשים הפרטיים לא משלמים עמלה.")
fix("כסף: ריבית ב-PayBox - ריכוך", "lessons/lesson*money.json",
    "שמאפשר גם לחסוך ולקבל ריבית על הכסף שבו.",
    "ובחלק מהמסלולים אפשר גם לקבל ריבית על היתרה (התנאים משתנים - בדקו באפליקציה).")

# ---------------------------------------------------------------- health funds
WALLET_TEXT = ("במכבי אפשר להוסיף את כרטיס החבר לארנק הדיגיטלי בטלפון - הקישור לכך פעיל רק מתוך אפליקציית מכבי > "
               "בקבלה במרפאה מצמידים את הטלפון לקורא הכרטיסים > בקופות האחרות בדקו באפליקציה אם יש 'כרטיס דיגיטלי' "
               "או 'הוספה לארנק' > עד שתוודאו שזה עובד אצלכם, כדאי להמשיך לשאת גם את הכרטיס הפיזי.")
set_step("קופות חולים: כרטיס בארנק דיגיטלי (אומת רק למכבי)", "lessons/lesson*healthfunds.json", "לארנק הדיגיטלי",
         text=WALLET_TEXT, title="מוסיפים את כרטיס קופת החולים לארנק הדיגיטלי")
set_quiz("קופות חולים: שאלת הארנק בחידון", "quizzes/quiz*healthfunds.json", "לארנק הדיגיטלי",
         question="רוצים להוסיף את כרטיס קופת החולים לארנק הדיגיטלי של הטלפון?",
         explanation="במכבי זה אפשרי דרך האפליקציה; בקופות אחרות כדאי לבדוק באפליקציה אם יש כרטיס דיגיטלי.")

# ---------------------------------------------------------------- gov.il
fix("gov.il: קוד GovID - בלי לקבוע מספר ספרות שלא אומת", "lessons/lesson*govil.json",
    "קבעו סיסמה אישית בת 6 ספרות", "קבעו קוד אישי לפי ההנחיות במסך")
fix("gov.il: מוקד 1299 בשלב ההרשמה", "lessons/lesson*govil.json",
    "קבלו קוד אימות ב-SMS או במייל והזינו אותו כדי לאשר את ההרשמה.",
    "קבלו קוד אימות ב-SMS או במייל והזינו אותו כדי לאשר את ההרשמה > אם נתקעים, מוקד התמיכה הממשלתי זמין בטלפון 1299.")

# ---------------------------------------------------------------- WhatsApp
NAV_TEXT = ("פתחו את הצ'אט עם עצמכם > לחצו לחיצה רגילה על הודעת המיקום ששלחתם - תיפתח מפה > "
            "לחצו על סמל השיתוף או 'פתח ב...' ובחרו אפליקציית ניווט (Google Maps או Waze) > הניווט לרכב יתחיל.")
set_step("וואטסאפ: ניווט מהודעת מיקום (לא 'הצטרף')", "lessons/lesson*whatsapp.json", "מנווטים לחניה", text=NAV_TEXT)
fix("וואטסאפ (אנדרואיד): 'נראות מדיה' במקום 'שמור בסרט הצילום'", "lessons/lesson_*_whatsapp.json",
    "כבו את המתג ליד 'שמור בסרט הצילום' (הוא יהיה אפור כשהוא כבוי).",
    "כבו את המתג 'נראות מדיה' (Media visibility) > מעכשיו תמונות וסרטונים חדשים שתקבלו לא יופיעו בגלריה. אפשר עדיין לשמור תמונה מסוימת ידנית.", 2)
fix("וואטסאפ (אייפון): '+' במקום 'סמל הסיכה'", "lessons/lesson_whatsapp.json",
    "לחצו על סמל הסיכה (בצד שמאל, מעל כפתורי הוויוצים)", "לחצו על ה־'+' ליד תיבת ההקלדה", 1)
fix("וואטסאפ (אייפון): שלב 'סקר' חסר", "lessons/lesson_whatsapp.json",
    "לחצו על ה־'+' > הקלידו שאלה ואפשרויות", "לחצו על ה־'+' > בחרו 'סקר' > הקלידו שאלה ואפשרויות", 1)
set_quiz("וואטסאפ (אייפון): תשובת החידון תואמת לשיעור", "quizzes/quiz_whatsapp.json", "להישמר אוטומטית בגלריה",
         answer_old="מכבים את הגדרת 'הצגת מדיה' בהגדרות הצ'אטים",
         answer_new="מכבים את 'שמור בסרט הצילום' (Save to Photos) בהגדרות הצ'אטים")
for f in ("quizzes/quiz_galaxy_whatsapp.json", "quizzes/quiz_xiaomi_whatsapp.json"):
    set_quiz("וואטסאפ (אנדרואיד): תשובת החידון - " + os.path.basename(f), f, "להישמר אוטומטית בגלריה",
             answer_old="מכבים את הגדרת 'הצגת מדיה' בהגדרות הצ'אטים",
             answer_new="מכבים את 'נראות מדיה' בהגדרות הצ'אטים")

# ---------------------------------------------------------------- AI
fix("AI (אנדרואיד): בלי Siri בקורסי אנדרואיד", "lessons/lesson_*_ai.json",
    "(כמו Gemini, ChatGPT או Siri עם Apple Intelligence)", "(כמו Gemini או ChatGPT)", 2)

# ---------------------------------------------------------------- Gmail
ROLLING = " > שימו לב: התכונה מתפרסת בהדרגה, וייתכן שעדיין אינה זמינה בעברית או בחשבון שלכם."
for t in ("מקבלים סיכום אוטומטי של מייל ארוך", "משתמשים ב'עזרה בכתיבה'", "משתמשים בתשובות מוצעות"):
    touched = 0
    for p in files("lessons/lesson*mail.json"):
        d = load(p)
        for s in d["steps"]:
            if t in s["title"] and ROLLING not in s["text"]:
                s["text"] = s["text"].rstrip() + ROLLING
                s["title"] = s["title"].replace("(עדכון 2026)", "(חדש)")
                touched += 1
        save(p, d)
    log.append(("OK" if touched else "CHECK", "Gmail: הסתייגות זמינות - " + t, touched))
set_step("Gmail: 'תיבת דואר חכמה' - זמינה רק למנויים בתשלום", "lessons/lesson*mail.json", "תיבת הדואר החכמה",
         title="מכירים את תיבת הדואר החכמה (AI Inbox)",
         text=("גוגל החלה להשיק 'תיבת דואר חכמה' (AI Inbox) שמרכזת בראש הרשימה מיילים חשובים, כמו תשלומים קרובים ותורים > "
               "נכון לסוף 2026 היא זמינה רק למנויים בתשלום ובמדינות מסוימות, כך שרוב המשתמשים עדיין לא יראו אותה - "
               "אין צורך לחפש אותה. כשתגיע, היא תהיה אופציונלית ואפשר יהיה להמשיך עם התיבה הרגילה."))
fix("Gmail: '(עדכון 2026)' בשאלות החידון", "quizzes/quiz*mail.json", " (עדכון 2026)?", "?")

# ---------------------------------------------------------------- Maps / Waze
for t in ("שואלים את Maps", "נעזרים בניווט תלת-ממדי"):
    touched = 0
    for p in files("lessons/lesson*maps.json"):
        d = load(p)
        for s in d["steps"]:
            note = " > התכונה הושקה ב-2026 ומתפרסת בהדרגה בין מדינות ושפות - אם אינכם רואים אותה, היא עדיין לא הגיעה אליכם."
            if t in s["title"] and note not in s["text"]:
                s["text"] = s["text"].rstrip() + note
                s["title"] = s["title"].replace("(עדכון 2026)", "(חדש)")
                touched += 1
        save(p, d)
    log.append(("OK" if touched else "CHECK", "Maps: הסתייגות זמינות - " + t, touched))
fix("Waze: התראת רכב חירום - רק בחלק מהמדינות", "lessons/lesson*waze.json",
    "> כמו כן, האפליקציה מתריעה כשמתקרב רכב חירום, כמו אמבולנס או מכבי אש, שעצר בצד הדרך - כדי שתוכלו להיערך מראש ולנהוג בזהירות.",
    "> במדינות מסוימות (נכון לעכשיו ארה\"ב, קנדה, מקסיקו וצרפת) Waze מתריע גם על רכב חירום שעצר בצד הדרך. ייתכן שזה יגיע גם לישראל בהמשך.", 3)

# ---------------------------------------------------------------- reviewed dates
VERIFIED = ["emergency", "healthfunds", "govil", "money", "safety", "whatsapp", "mail", "maps", "waze"]
n = 0
for topic in VERIFIED:
    for p in files("lessons/lesson*%s.json" % topic):
        d = load(p)
        d["reviewed"] = REVIEWED
        save(p, d)
        n += 1
log.append(("OK", "תאריך 'נבדק לאחרונה' בשיעורים שנבדקו", n))

bad = 0
for status, label, touched in log:
    print("%-5s %-70s קבצים: %d" % (status, label, touched))
    bad += status != "OK"
sys.exit(1 if bad else 0)
