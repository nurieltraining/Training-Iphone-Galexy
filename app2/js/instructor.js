/* instructor.js — tools for the person teaching the course:
   1. Session handout  (#/session/<n>)            - a print-friendly page per
      syllabus session: goal, contents, every core lesson's steps as a
      numbered checklist, the in-class practice and the extension task.
   2. Presenter mode   (#/present/<catId>/<step>) - one step at a time in very
      large type for a projector/TV, with previous/next buttons and the
      keyboard arrow keys. */
window.App = window.App || {};

App.instructor = (function () {
  const esc = (s) => App.utils.escapeHtml(s);
  let keyHandler = null;

  function header(backLabel, backHash) {
    return '<header class="top no-print"><div class="top-row"><button type="button" class="back-btn" data-go="' + esc(backHash) + '">→ ' +
      esc(backLabel) + "</button>" + App.textSize.buttonHtml() + "</div></header>";
  }

  function wireBack(root) {
    root.onclick = (e) => {
      const go = e.target.closest("[data-go]");
      if (go) App.router.navigate(go.getAttribute("data-go"));
      if (e.target.closest("[data-print]")) window.print();
    };
  }

  async function renderSession(root, n) {
    const syllabus = await App.loader.getSyllabus();
    const s = syllabus && syllabus.sessions.find((x) => x.n === n);
    if (!s) { App.router.navigate("#/"); return; }
    const course = App.ui.currentCourse();
    const cats = s.core.map((b) => App.ui.catForBase(b, course)).filter(Boolean);
    const extras = s.extra.map((b) => App.ui.catForBase(b, course)).filter(Boolean);
    const lessons = await Promise.all(cats.map((c) => App.loader.getLesson(c.lessonFile)));
    root.innerHTML =
      header("חזרה למסלול", "#/") +
      '<main class="handout">' +
      '<button type="button" class="btn quiz-start-btn no-print" data-print="1">🖨️ הדפסת דף המפגש</button>' +
      '<h1 class="handout-title">מפגש ' + s.n + ": " + esc(s.title) + "</h1>" +
      '<p class="handout-course">' + esc(App.ui.courseName(course)) + "</p>" +
      '<h2>מטרת המפגש</h2><p>' + esc(s.goal) + "</p>" +
      (s.contents ? "<h2>תכנים</h2><p>" + esc(s.contents) + "</p>" : "") +
      lessons.map((l, i) => l
        ? "<h2>" + esc(cats[i].title) + "</h2><ol class=\"handout-steps\">" +
          l.steps.map((st) => "<li><span class=\"box\">☐</span> " + esc(st.title) + "</li>").join("") + "</ol>"
        : "").join("") +
      (s.practice ? '<h2>תרגול בכיתה</h2><p class="handout-box">' + esc(s.practice) + "</p>" : "") +
      (s.challenge ? '<h2>משימת הרחבה (למתקדמים)</h2><p class="handout-box">' + esc(s.challenge) + "</p>" : "") +
      (extras.length ? "<h2>להמשך בבית</h2><p>" + extras.map((c) => esc(c.title)).join(" • ") + "</p>" : "") +
      '<p class="handout-foot">כל השלבים המלאים נמצאים באפליקציה "לומדים בקלות", בלשונית "לפי מפגשי הקורס".</p>' +
      "</main>";
    wireBack(root);
    window.scrollTo(0, 0);
  }

  async function renderPresent(root, catId, stepIdx) {
    const cat = App.ui.findCategory(catId);
    if (!cat) { App.router.navigate("#/"); return; }
    const lesson = await App.loader.getLesson(cat.lessonFile);
    if (!lesson) { App.router.navigate("#/category/" + catId); return; }
    const total = lesson.steps.length;
    const i = Math.min(Math.max(0, stepIdx | 0), total - 1);
    const s = lesson.steps[i];
    const parts = s.text.indexOf(">") >= 0 ? s.text.split(">").map((x) => x.trim()).filter(Boolean) : null;
    root.innerHTML =
      '<div class="present">' +
      '<div class="present-top"><button type="button" class="back-btn" data-go="#/category/' + esc(catId) + '">✕ יציאה ממצב הצגה</button>' +
      '<span class="present-count">' + esc(lesson.title) + " · שלב " + (i + 1) + " מתוך " + total + "</span></div>" +
      '<h1 class="present-title"><span class="step-num">' + (i + 1) + "</span>" + esc(s.title) + "</h1>" +
      (parts
        ? '<ol class="present-steps">' + parts.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ol>"
        : '<p class="present-text">' + esc(s.text) + "</p>") +
      (s.warning ? '<p class="present-warn">⚠️ ' + esc(s.warning) + "</p>" : "") +
      '<div class="present-nav">' +
      '<button type="button" class="btn present-btn" data-go="#/present/' + esc(catId) + "/" + (i + 1) + '"' + (i >= total - 1 ? " disabled" : "") + ">הבא ←</button>" +
      '<button type="button" class="btn present-btn secondary" data-go="#/present/' + esc(catId) + "/" + (i - 1) + '"' + (i <= 0 ? " disabled" : "") + ">→ הקודם</button>" +
      "</div></div>";
    wireBack(root);
    if (keyHandler) document.removeEventListener("keydown", keyHandler);
    keyHandler = (e) => {
      if (!/^#\/present\//.test(location.hash)) { document.removeEventListener("keydown", keyHandler); keyHandler = null; return; }
      // RTL: left arrow = forward, right arrow = back
      if ((e.key === "ArrowLeft" || e.key === "PageDown" || e.key === " ") && i < total - 1) { e.preventDefault(); App.router.navigate("#/present/" + catId + "/" + (i + 1)); }
      if ((e.key === "ArrowRight" || e.key === "PageUp") && i > 0) { e.preventDefault(); App.router.navigate("#/present/" + catId + "/" + (i - 1)); }
      if (e.key === "Escape") App.router.navigate("#/category/" + catId);
    };
    document.addEventListener("keydown", keyHandler);
    window.scrollTo(0, 0);
  }

  return { renderSession, renderPresent };
})();
