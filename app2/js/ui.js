/* ui.js — the home screen (category grid) and small shared UI bits.
   Category list comes only from categories.json (already loaded at startup);
   individual lesson/quiz JSON files are NOT touched here.
   Supports multiple independent courses (iPhone, Galaxy, Xiaomi) — each
   course's categories/lessons/quizzes are entirely separate. */
window.App = window.App || {};

App.ui = (function () {
  let categoriesData = null;
  let currentCourse = null;
  const COURSE_KEY = "app2-last-course";
  const LAST_CAT_KEY = "app2-last-cat"; // { [courseId]: catId } — powers "continue where you left off"
  const VIEW_KEY = "app2-home-view"; // "topics" | "sessions"
  const SEEN_NEW_KEY = "app2-seen-new"; // { [catId]: true } — clears the "new" badge once a category is opened once
  const esc = (s) => App.utils.escapeHtml(s);

  function setCategories(data) {
    categoriesData = data;
    if (!currentCourse && data.courses && data.courses.length) {
      currentCourse = data.courses[0].id;
    }
  }

  function categoriesForCourse(courseId) {
    // Array order in categories.json is the display order (the `order` field
    // is not used for display — it differs from the intended home layout).
    return categoriesData ? categoriesData.categories.filter((c) => c.course === courseId) : [];
  }

  function findCategory(id) {
    return categoriesData ? categoriesData.categories.find((c) => c.id === id) : null;
  }

  // Next category in the same course (display order), or null at the end.
  function nextCategory(cat) {
    const list = categoriesForCourse(cat.course);
    const i = list.findIndex((c) => c.id === cat.id);
    return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  }

  async function rememberLastCategory(cat) {
    const map = await App.storage.getJSON(LAST_CAT_KEY, {});
    map[cat.course] = cat.id;
    await App.storage.setJSON(LAST_CAT_KEY, map);
  }

  function doneCount(cat, progress) {
    let done = 0;
    for (let i = 0; i < cat.stepCount; i++) if (progress[cat.id + "-" + i]) done++;
    return done;
  }

  async function renderHome(root) {
    if (!categoriesData) {
      root.innerHTML = '<div class="load-error">לא הצלחנו לטעון את רשימת הנושאים.</div>';
      return;
    }

    const savedCourse = await App.storage.get(COURSE_KEY);
    if (savedCourse && categoriesData.courses.some((c) => c.id === savedCourse)) {
      currentCourse = savedCourse;
    }

    const progress = await App.storage.getJSON("app2-learned", {});
    const seenNew = await App.storage.getJSON(SEEN_NEW_KEY, {});
    const scores = await App.storage.getJSON("app2-quiz-scores", {});
    const lastCats = await App.storage.getJSON(LAST_CAT_KEY, {});
    const courses = categoriesData.courses;
    const cats = categoriesForCourse(currentCourse);

    const totalSteps = cats.reduce((n, c) => n + (c.stepCount || 0), 0);
    const totalDone = cats.reduce((n, c) => n + doneCount(c, progress), 0);
    const pct = totalSteps ? Math.max(totalDone ? 1 : 0, Math.round((totalDone / totalSteps) * 100)) : 0;
    const lastCat = lastCats[currentCourse] ? findCategory(lastCats[currentCourse]) : null;
    const view = (await App.storage.get(VIEW_KEY)) === "sessions" ? "sessions" : "topics";
    const syllabus = view === "sessions" ? await App.loader.getSyllabus() : null;

    root.innerHTML =
      '<header class="top">' +
      '<div class="top-row">' +
      '<div class="home-brand"><img class="home-logo" src="images/logo-nuriel-ai.webp" alt="Nuriel AI">' +
      '<span class="app-title">לומדים בקלות</span></div>' +
      App.textSize.buttonHtml() +
      "</div>" +
      (courses.length > 1
        ? '<div class="course-tabs" role="tablist" aria-label="בחירת סוג טלפון">' +
          courses
            .map(
              (c) =>
                '<button type="button" role="tab" aria-selected="' + (c.id === currentCourse) + '" class="course-tab' +
                (c.id === currentCourse ? " active" : "") + '" data-course="' + esc(c.id) + '">' + esc(c.name) + "</button>"
            )
            .join("") +
          "</div>"
        : "") +
      '<div class="view-toggle" role="group" aria-label="אופן התצוגה">' +
      '<button type="button" class="view-btn' + (view === "topics" ? " active" : "") + '" data-view="topics" aria-pressed="' + (view === "topics") + '">כל הנושאים</button>' +
      '<button type="button" class="view-btn' + (view === "sessions" ? " active" : "") + '" data-view="sessions" aria-pressed="' + (view === "sessions") + '">לפי מפגשי הקורס</button>' +
      "</div>" +
      '<label class="sr-only" for="home-search">חיפוש בכל השיעורים</label>' +
      '<input class="search-box" type="search" placeholder="🔍 חיפוש (למשל: סיסמה)" id="home-search" autocomplete="off">' +
      "</header>" +
      "<main>" +
      '<div id="home-content">' +
      '<div class="overall-card">' +
      '<div><div class="num">' + pct + '%</div><div class="label">' + totalDone + " מתוך " + totalSteps + " שלבים נלמדו</div></div>" +
      (lastCat
        ? '<button type="button" class="continue-btn" data-cat="' + esc(lastCat.id) + '">להמשיך: ' + esc(lastCat.title) + " ←</button>"
        : '<div class="label">בחרו נושא כדי להתחיל 👇</div>') +
      "</div>" +
      (view === "sessions" && syllabus
        ? sessionsHtml(syllabus, progress)
        : '<div class="grid" id="home-grid">' + cats.map((c) => cardHtml(c, progress, seenNew, scores)).join("") + "</div>") +
      "</div>" +
      '<div id="search-results" class="search-results" style="display:none;" aria-live="polite"></div>' +
      '<footer class="home-footer"><button type="button" class="link-btn" data-sync="1">🔄 ההתקדמות שלי במכשיר חדש</button>' +
      '<button type="button" class="link-btn" data-privacy="1">🔒 פרטיות ומידע אישי</button></footer>' +
      "</main>";

    App.utils.qsa(".view-btn", root).forEach((btn) =>
      btn.addEventListener("click", async () => {
        await App.storage.set(VIEW_KEY, btn.getAttribute("data-view"));
        await renderHome(root);
        App.utils.qs('.view-btn[data-view="' + btn.getAttribute("data-view") + '"]', root)?.focus();
      })
    );

    App.utils.qsa(".course-tab", root).forEach((btn) =>
      btn.addEventListener("click", async () => {
        currentCourse = btn.getAttribute("data-course");
        await App.storage.set(COURSE_KEY, currentCourse);
        await renderHome(root);
        App.utils.qs('.course-tab[data-course="' + currentCourse + '"]', root)?.focus();
      })
    );

    const openCat = async (catId, stepIdx) => {
      const cat = findCategory(catId);
      if (cat && cat.isNew && !seenNew[catId]) {
        seenNew[catId] = true;
        await App.storage.setJSON(SEEN_NEW_KEY, seenNew);
      }
      App.router.navigate("#/category/" + catId + (stepIdx != null ? "/step/" + stepIdx : ""));
    };

    App.utils.qs("#home-content", root).addEventListener("click", (e) => {
      if (e.target.closest("[data-certificate]")) { App.router.navigate("#/certificate"); return; }
      const ses = e.target.closest("[data-session]");
      if (ses) { App.router.navigate("#/session/" + ses.getAttribute("data-session")); return; }
      const card = e.target.closest("[data-cat]");
      if (card) openCat(card.getAttribute("data-cat"));
    });

    const searchInput = App.utils.qs("#home-search", root);
    searchInput.addEventListener(
      "input",
      App.utils.debounce(async (e) => {
        const q = e.target.value.trim();
        const resultsEl = App.utils.qs("#search-results", root);
        const contentEl = App.utils.qs("#home-content", root);
        if (!q) {
          resultsEl.style.display = "none";
          contentEl.style.display = "";
          return;
        }
        const results = (await App.search.query(q)).filter((r) => r.course === currentCourse);
        contentEl.style.display = "none";
        resultsEl.style.display = "block";
        resultsEl.innerHTML = results.length
          ? '<p class="search-results-hint">נמצאו ' + results.length + " תוצאות:</p>" +
            results
              .map(
                (r) =>
                  '<button type="button" class="search-result" data-cat="' + esc(r.catId) + '" data-step="' + (r.stepIndex | 0) + '">' +
                  '<span class="sr-cat">' + esc(r.catTitle) + "</span>" +
                  '<span class="sr-title">' + esc(r.title) + "</span>" +
                  "</button>"
              )
              .join("")
          : '<p class="no-results">לא נמצאו תוצאות. נסו מילה אחרת או קצרה יותר.</p>';
        App.utils.qsa(".search-result", resultsEl).forEach((el) =>
          el.addEventListener("click", () => openCat(el.getAttribute("data-cat"), el.getAttribute("data-step")))
        );
      }, 250)
    );
  }

  // ---- course path ("by session") view -------------------------------
  // syllabus.json lists topic base names ("whatsapp", "meet"...); each
  // course's category id is the base name (iPhone) or "<course>_<base>".
  function catForBase(base, course) {
    if (base === "meet") return findCategory({ iphone: "meetiphone", galaxy: "galaxy_meetgalaxy", xiaomi: "xiaomi_meetxiaomi" }[course]);
    return findCategory(course === "iphone" ? base : course + "_" + base);
  }

  function coreCats(syllabus, course) {
    const seen = {};
    const out = [];
    syllabus.sessions.forEach((s) => s.core.forEach((b) => {
      const c = catForBase(b, course);
      if (c && !seen[c.id]) { seen[c.id] = 1; out.push(c); }
    }));
    return out;
  }

  function courseComplete(syllabus, progress) {
    const list = coreCats(syllabus, currentCourse);
    return list.length > 0 && list.every((c) => doneCount(c, progress) === c.stepCount);
  }

  function sessionsHtml(syllabus, progress) {
    const chip = (base, extra) => {
      const c = catForBase(base, currentCourse);
      if (!c) return "";
      const d = doneCount(c, progress);
      const full = d === c.stepCount;
      return '<button type="button" class="session-chip' + (extra ? " extra" : "") + (full ? " done" : "") + '" data-cat="' + esc(c.id) + '">' +
        (full ? "✓ " : "") + esc(c.title) + ' <span class="chip-frac">' + d + "/" + c.stepCount + "</span></button>";
    };
    const done = courseComplete(syllabus, progress);
    return (
      '<p class="sessions-note">' + esc(syllabus.note) + "</p>" +
      syllabus.sessions.map((s) => {
        const cats = s.core.map((b) => catForBase(b, currentCourse)).filter(Boolean);
        const total = cats.reduce((n, c) => n + c.stepCount, 0);
        const d = cats.reduce((n, c) => n + doneCount(c, progress), 0);
        const pct = total ? Math.round((d / total) * 100) : 0;
        return '<section class="session-card' + (pct === 100 ? " complete" : "") + '">' +
          '<h2 class="session-title"><span class="session-num">' + s.n + "</span>" + esc(s.title) + "</h2>" +
          '<p class="session-goal">' + esc(s.goal) + "</p>" +
          '<div class="progress-track light" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="התקדמות במפגש ' + s.n + '"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="session-chips">' + s.core.map((b) => chip(b, false)).join("") + "</div>" +
          (s.extra.length ? '<p class="session-extra-label">הרחבה:</p><div class="session-chips">' + s.extra.map((b) => chip(b, true)).join("") + "</div>" : "") +
          '<button type="button" class="link-btn session-handout" data-session="' + s.n + '">📄 דף המפגש להדפסה (למדריך)</button>' +
          "</section>";
      }).join("") +
      '<button type="button" class="btn certificate-btn" data-certificate="1"' + (done ? "" : " disabled") + ">" +
      (done ? "🎓 קבלת תעודת סיום" : "🎓 תעודת סיום - תיפתח כשתסיימו את כל שיעורי הליבה") + "</button>"
    );
  }

  async function renderCertificate(root) {
    const syllabus = await App.loader.getSyllabus();
    const progress = await App.storage.getJSON("app2-learned", {});
    const info = (await App.registration.getUserInfo()) || {};
    const course = (categoriesData.courses.find((c) => c.id === currentCourse) || {}).name || "";
    const ok = syllabus && courseComplete(syllabus, progress);
    const name = [info.first, info.last].filter(Boolean).join(" ");
    const today = new Date();
    const date = today.getDate() + "." + (today.getMonth() + 1) + "." + today.getFullYear();
    root.innerHTML =
      '<header class="top"><div class="top-row"><button type="button" class="back-btn" data-action="cert-home">→ חזרה</button>' +
      App.textSize.buttonHtml() + "</div></header><main>" +
      (ok
        ? '<div class="certificate" id="certificate">' +
          '<img src="images/logo-nuriel-ai.webp" alt="" class="cert-logo">' +
          '<p class="cert-kicker">תעודת סיום</p>' +
          '<label class="sr-only" for="cert-name">השם על התעודה</label>' +
          '<input id="cert-name" class="cert-name" value="' + esc(name) + '" placeholder="הקלידו כאן את שמכם">' +
          '<p class="cert-text">סיים/ה בהצלחה את הקורס</p>' +
          '<p class="cert-course">' + esc(syllabus.title) + "<br>" + esc(course) + "</p>" +
          '<p class="cert-date">' + date + "</p></div>" +
          '<button type="button" class="btn quiz-start-btn" data-action="cert-print">🖨️ הדפסה / שמירה כ-PDF</button>'
        : '<p class="load-error">התעודה תיפתח אחרי שתסמנו "למדתי" בכל השלבים של שיעורי הליבה במסלול הקורס.</p>') +
      "</main>";
    root.onclick = (e) => {
      const a = e.target.closest("[data-action]");
      if (!a) return;
      if (a.getAttribute("data-action") === "cert-home") App.router.navigate("#/");
      if (a.getAttribute("data-action") === "cert-print") window.print();
    };
  }

  function cardHtml(cat, progress, seenNew, scores) {
    const done = doneCount(cat, progress);
    const complete = cat.stepCount && done === cat.stepCount;
    const showNewBadge = cat.isNew && !(seenNew && seenNew[cat.id]);
    const best = scores && scores[cat.id];
    return (
      '<button type="button" class="cat-card' + (complete ? " complete" : "") + '" data-cat="' + esc(cat.id) + '" ' +
      'aria-label="' + esc(cat.title + " - " + done + " מתוך " + cat.stepCount + " שלבים נלמדו, רמה: " + (cat.difficulty || "")) + '">' +
      (showNewBadge ? '<span class="new-badge">חדש</span>' : "") +
      (complete ? '<span class="done-badge" aria-hidden="true">✓</span>' : "") +
      '<span class="cat-img-wrap">' + iconHtml(cat) + "</span>" +
      '<span class="cat-name">' + esc(cat.title) + "</span>" +
      '<span class="cat-bottom">' +
      '<span class="cat-frac">' + done + "/" + cat.stepCount + (best ? " · 📝" + best : "") + "</span>" +
      '<span class="level-badge level-' + esc(cat.difficulty || "") + '">' + esc(cat.difficulty || "") + "</span>" +
      "</span>" +
      "</button>"
    );
  }

  function iconHtml(cat) {
    if (!cat.image) return '<span class="cat-icon-fallback">' + esc(cat.icon || "") + "</span>";
    return '<img src="' + esc(cat.image) + '" alt="" class="cat-card-img" loading="lazy">';
  }

  function courseName(id) {
    return ((categoriesData && categoriesData.courses.find((c) => c.id === id)) || {}).name || "";
  }

  return {
    setCategories, findCategory, renderHome, renderCertificate, nextCategory, rememberLastCategory,
    catForBase, courseName, currentCourse: () => currentCourse,
  };
})();
