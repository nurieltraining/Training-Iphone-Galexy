/**
 * לומדים בקלות - Google Apps Script backend (v26)
 *
 * Receives everything the app sends and writes it to tabs in the bound
 * Google Sheet. Also stores/returns learning progress (cross-device sync)
 * and builds a summary dashboard.
 *
 * Request types (the app already sends all of these):
 *   (no type)      registration            -> tab "הרשמות"
 *   visit          page view               -> tab "ביקורים"
 *   quiz_result    quiz score + wrong Qs   -> tab "חידונים"
 *   lesson_step    step marked learned     -> tab "שלבים"
 *   feedback       comment                 -> tab "משוב"
 *   progress_sync  progress backup (JSON)  -> tab "התקדמות" (one row per person)
 *   progress_get   returns saved progress  (JSON reply)
 *
 * Install: see README.md in this folder. Keep a copy of your old script first.
 */

// Email alerts go to the Google account that owns this script ("Execute as: Me"),
// so no address is written in the code. Set to false to turn a type off.
var NOTIFY = { registration: true, feedback: true };

var TABS = {
  registration: ["הרשמות", ["זמן", "שם פרטי", "שם משפחה", "טלפון", "אימייל", "עיר", "מסגרת", "מכשיר", "אפליקציה"]],
  visit: ["ביקורים", ["זמן", "אזור", "מכשיר", "sessionId", "אפליקציה"]],
  quiz_result: ["חידונים", ["זמן", "נושא", "ציון", "מתוך", "שאלות שגויות", "מכשיר", "sessionId"]],
  lesson_step: ["שלבים", ["זמן", "נושא", "מספר שלב", "כותרת שלב", "פעולה", "מכשיר", "sessionId"]],
  feedback: ["משוב", ["זמן", "שם פרטי", "שם משפחה", "טלפון", "הקשר", "הערה", "מכשיר", "sessionId"]],
  progress: ["התקדמות", ["טלפון", "אימייל", "עודכן", "שלבים שנלמדו", "נתונים (JSON)"]]
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var p = readParams_(e);
    var type = p.type || "registration";
    if (type === "progress_get") return json_(getProgress_(p));
    if (type === "progress_sync") { saveProgress_(p); return json_({ ok: true }); }
    var now = new Date();
    if (type === "registration") {
      append_("registration", [now, p.firstName, p.lastName, "'" + (p.phone || ""), p.email, p.city, p.org, p.deviceType, p.appName]);
      if (NOTIFY.registration) notify_("נרשם חדש: " + (p.firstName || "") + " " + (p.lastName || ""), [
        "שם: " + (p.firstName || "") + " " + (p.lastName || ""), "טלפון: " + (p.phone || ""), "אימייל: " + (p.email || ""),
        "עיר: " + (p.city || ""), "מסגרת: " + (p.org || ""), "מכשיר: " + (p.deviceType || "")]);
    }
    else if (type === "visit") append_("visit", [now, p.area, p.deviceType, p.sessionId, p.appName]);
    else if (type === "quiz_result") append_("quiz_result", [now, p.area, Number(p.score), Number(p.total), p.wrongQuestions, p.deviceType, p.sessionId]);
    else if (type === "lesson_step") append_("lesson_step", [now, p.area, Number(p.stepIndex) + 1, p.stepTitle, p.marked, p.deviceType, p.sessionId]);
    else if (type === "feedback") {
      append_("feedback", [now, p.firstName, p.lastName, "'" + (p.phone || ""), p.context, p.comment, p.deviceType, p.sessionId]);
      if (NOTIFY.feedback) notify_("משוב חדש מהאפליקציה" + (p.context ? " - " + p.context : ""), [
        "ההודעה: " + (p.comment || ""), "", "מאת: " + ([p.firstName, p.lastName].filter(Boolean).join(" ") || "משתמש לא רשום"),
        "טלפון: " + (p.phone || "-"), "נושא באפליקציה: " + (p.context || "-"), "מכשיר: " + (p.deviceType || "")]);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Sends an email to the script owner. Never lets a mail problem block logging.
function notify_(subject, lines) {
  try {
    var to = Session.getEffectiveUser().getEmail();
    if (!to) return;
    var url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    MailApp.sendEmail(to, "לומדים בקלות | " + subject, lines.join("\n") + "\n\nהגיליון: " + url);
  } catch (err) { /* mail quota / permission - ignore */ }
}

// Run once by hand to check that alerts reach your inbox.
function testEmail() {
  notify_("בדיקת התראות", ["אם קיבלת את המייל הזה, ההתראות עובדות."]);
}

function doGet() {
  return json_({ ok: true, app: "lomdim-bekalut" });
}

// form-urlencoded (most pings) or a JSON body sent as text/plain (sync)
function readParams_(e) {
  var p = (e && e.parameter) ? JSON.parse(JSON.stringify(e.parameter)) : {};
  if (e && e.postData && e.postData.contents && e.postData.contents.charAt(0) === "{") {
    var body = JSON.parse(e.postData.contents);
    for (var k in body) p[k] = body[k];
  }
  return p;
}

function sheet_(key) {
  var def = TABS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(def[0]);
  if (!sh) {
    sh = ss.insertSheet(def[0]);
    sh.appendRow(def[1]);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  return sh;
}

function append_(key, row) {
  sheet_(key).appendRow(row.map(function (v) { return v === undefined ? "" : v; }));
}

function norm_(phone, email) {
  return { phone: String(phone || "").replace(/[^\d]/g, ""), email: String(email || "").trim().toLowerCase() };
}

function findProgressRow_(sh, id) {
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).replace(/[^\d]/g, "") === id.phone && String(data[i][1]).toLowerCase() === id.email) return i + 1;
  }
  return -1;
}

function saveProgress_(p) {
  var id = norm_(p.phone, p.email);
  if (id.phone.length < 9 || id.email.indexOf("@") < 1) return;
  var prog = typeof p.progress === "string" ? JSON.parse(p.progress) : (p.progress || {});
  var sh = sheet_("progress");
  var row = findProgressRow_(sh, id);
  // merge with what is stored, so two devices never overwrite each other
  if (row > 0) {
    var old = JSON.parse(sh.getRange(row, 5).getValue() || "{}");
    prog.learned = Object.assign({}, old.learned || {}, prog.learned || {});
    var sc = Object.assign({}, old.scores || {});
    for (var k in (prog.scores || {})) sc[k] = Math.max(sc[k] || 0, prog.scores[k]);
    prog.scores = sc;
    prog.lastCat = Object.assign({}, old.lastCat || {}, prog.lastCat || {});
  }
  var values = ["'" + id.phone, id.email, new Date(), Object.keys(prog.learned || {}).length, JSON.stringify(prog)];
  if (row > 0) sh.getRange(row, 1, 1, values.length).setValues([values]);
  else sh.appendRow(values);
}

function getProgress_(p) {
  var id = norm_(p.phone, p.email);
  var sh = sheet_("progress");
  var row = findProgressRow_(sh, id);
  if (row < 0) return { ok: false };
  return { ok: true, progress: JSON.parse(sh.getRange(row, 5).getValue() || "{}") };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Dashboard: run refreshDashboard() once by hand, then installDailyTrigger()
// to refresh it automatically every night.
// ---------------------------------------------------------------------------
function refreshDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName("דשבורד") || ss.insertSheet("דשבורד", 0);
  dash.clear();
  dash.setRightToLeft(true);
  var r = 1;
  function title(t) { dash.getRange(r, 1).setValue(t).setFontWeight("bold").setFontSize(13); r++; }
  function table(head, rows) {
    dash.getRange(r, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#e3f1e8");
    r++;
    if (rows.length) { dash.getRange(r, 1, rows.length, head.length).setValues(rows); r += rows.length; }
    r++;
  }
  function rows_(key) {
    var sh = ss.getSheetByName(TABS[key][0]);
    return sh ? sh.getDataRange().getValues().slice(1) : [];
  }
  function count(rows, col) {
    var m = {};
    rows.forEach(function (x) { var k = x[col]; if (k !== "" && k !== undefined) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  var since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  var visits = rows_("visit").filter(function (x) { return x[0] >= since; });
  var quizzes = rows_("quiz_result").filter(function (x) { return x[0] >= since; });
  var steps = rows_("lesson_step").filter(function (x) { return x[0] >= since; });

  dash.getRange(r, 1).setValue("עודכן: " + new Date().toLocaleString("he-IL") + " | נתוני 30 הימים האחרונים"); r += 2;

  title("סיכום");
  var sessions = {}; visits.forEach(function (x) { if (x[3]) sessions[x[3]] = 1; });
  table(["מדד", "ערך"], [
    ["ביקורים (צפיות בדפים)", visits.length],
    ["ביקורים נפרדים (sessionId)", Object.keys(sessions).length],
    ["נרשמים (סה״כ)", rows_("registration").length],
    ["חידונים שהוגשו", quizzes.length],
    ["שלבים שסומנו 'למדתי'", steps.filter(function (x) { return x[4] === "learned"; }).length],
    ["משתמשים עם התקדמות שמורה", rows_("progress").length]
  ]);

  title("הנושאים הנצפים ביותר");
  table(["אזור", "צפיות"], count(visits, 1).slice(0, 25));

  title("חידונים: ציון ממוצע לפי נושא (הכי נמוך למעלה)");
  var agg = {};
  quizzes.forEach(function (x) { var a = agg[x[1]] || (agg[x[1]] = [0, 0, 0]); a[0] += Number(x[2]); a[1] += Number(x[3]); a[2]++; });
  table(["נושא", "ממוצע %", "מספר הגשות"], Object.keys(agg).map(function (k) {
    return [k, Math.round(100 * agg[k][0] / Math.max(1, agg[k][1])), agg[k][2]];
  }).sort(function (a, b) { return a[1] - b[1]; }));

  title("השאלות שטועים בהן הכי הרבה");
  var wrong = {};
  quizzes.forEach(function (x) {
    String(x[4] || "").split(",").forEach(function (q) { q = q.trim(); if (q) { var k = x[1] + " - שאלה " + q; wrong[k] = (wrong[k] || 0) + 1; } });
  });
  table(["נושא ושאלה", "טעויות"], Object.keys(wrong).map(function (k) { return [k, wrong[k]]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 25));

  title("איפה מפסיקים: השלב האחרון שסומן בכל נושא (חציון)");
  var last = {};
  steps.filter(function (x) { return x[4] === "learned"; }).forEach(function (x) { (last[x[1]] = last[x[1]] || []).push(Number(x[2])); });
  table(["נושא", "שלב חציוני", "סימונים"], Object.keys(last).map(function (k) {
    var a = last[k].sort(function (p, q) { return p - q; });
    return [k, a[Math.floor(a.length / 2)], a.length];
  }).sort(function (a, b) { return b[2] - a[2]; }));

  title("מכשירים");
  table(["מכשיר", "צפיות"], count(visits, 2));
  dash.autoResizeColumns(1, 3);
}

// Run once after installing: creates ALL tabs right away (otherwise each tab
// appears only when the first piece of data of its type arrives) and builds
// the dashboard.
function setupSheets() {
  for (var key in TABS) sheet_(key);
  refreshDashboard();
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "refreshDashboard") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("refreshDashboard").timeBased().everyDays(1).atHour(3).create();
}
