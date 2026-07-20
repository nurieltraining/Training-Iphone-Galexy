/* ui.js — the home screen (category grid) and small shared UI bits.
   Category list comes only from categories.json (already loaded at startup);
   individual lesson/quiz JSON files are NOT touched here.
   Supports multiple independent courses (iPhone, Galaxy, future courses) —
   each course's categories/lessons/quizzes are entirely separate; nothing
   about them is kept "in sync" by this app on purpose. */
window.App = window.App || {};

App.ui = (function () {
  let categoriesData = null;
  let currentCourse = null;
  const COURSE_KEY = "app2-last-course";
  const SEEN_NEW_KEY = "app2-seen-new"; // { [catId]: true } — clears the "new" badge once a category is opened once

  function setCategories(data) {
    categoriesData = data;
    if (!currentCourse && data.courses && data.courses.length) {
      currentCourse = data.courses[0].id;
    }
  }

  function categoriesForCourse(courseId) {
    return categoriesData ? categoriesData.categories.filter((c) => c.course === courseId) : [];
  }

  function findCategory(id) {
    return categoriesData ? categoriesData.categories.find((c) => c.id === id) : null;
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
    const courses = categoriesData.courses;
    const cats = categoriesForCourse(currentCourse);

    root.innerHTML =
      '<header class="top">' +
      (courses.length > 1
        ? '<div class="course-tabs">' +
          courses.map((c) => '<button class="course-tab' + (c.id === currentCourse ? " active" : "") + '" data-course="' + c.id + '">' + App.utils.escapeHtml(c.name) + "</button>").join("") +
          "</div>"
        : '<div class="app-title">' + App.utils.escapeHtml(courses[0] ? courses[0].name : "") + "</div>") +
      '<input class="search-box" type="search" placeholder="חיפוש..." id="home-search">' +
      "</header>" +
      '<div class="grid" id="home-grid">' +
      cats.map((c) => cardHtml(c, progress, seenNew)).join("") +
      "</div>" +
      '<div id="search-results" class="search-results" style="display:none;"></div>';

    App.utils.qsa(".course-tab", root).forEach((btn) =>
      btn.addEventListener("click", async () => {
        currentCourse = btn.getAttribute("data-course");
        await App.storage.set(COURSE_KEY, currentCourse);
        renderHome(root);
      })
    );

    App.utils.qs("#home-grid", root).addEventListener("click", async (e) => {
      const card = e.target.closest("[data-cat]");
      if (!card) return;
      const catId = card.getAttribute("data-cat");
      const cat = findCategory(catId);
      if (cat && cat.isNew && !seenNew[catId]) {
        seenNew[catId] = true;
        await App.storage.setJSON(SEEN_NEW_KEY, seenNew);
      }
      App.router.navigate("#/category/" + catId);
    });

    const searchInput = App.utils.qs("#home-search", root);
    searchInput.addEventListener(
      "input",
      App.utils.debounce(async (e) => {
        const q = e.target.value.trim();
        const resultsEl = App.utils.qs("#search-results", root);
        const gridEl = App.utils.qs("#home-grid", root);
        if (!q) {
          resultsEl.style.display = "none";
          gridEl.style.display = "grid";
          return;
        }
        const results = (await App.search.query(q)).filter((r) => r.course === currentCourse);
        gridEl.style.display = "none";
        resultsEl.style.display = "block";
        resultsEl.innerHTML = results.length
          ? results
              .map(
                (r) =>
                  '<div class="search-result" data-cat="' + r.catId + '">' +
                  '<div class="sr-cat">' + App.utils.escapeHtml(r.catTitle) + "</div>" +
                  '<div class="sr-title">' + App.utils.escapeHtml(r.title) + "</div>" +
                  "</div>"
              )
              .join("")
          : '<p class="no-results">לא נמצאו תוצאות</p>';
        App.utils.qsa(".search-result", resultsEl).forEach((el) =>
          el.addEventListener("click", () => App.router.navigate("#/category/" + el.getAttribute("data-cat")))
        );
      }, 250)
    );
  }

  function cardHtml(cat, progress, seenNew) {
    let done = 0;
    for (let i = 0; i < cat.stepCount; i++) if (progress[cat.id + "-" + i]) done++;
    const showNewBadge = cat.isNew && !(seenNew && seenNew[cat.id]);
    return (
      '<div class="cat-card" data-cat="' + cat.id + '">' +
      (showNewBadge ? '<div class="new-badge">חדש</div>' : "") +
      '<div class="cat-img-wrap">' + iconHtml(cat) + "</div>" +
      '<div class="cat-bottom">' +
      '<div class="cat-frac">' + done + "/" + cat.stepCount + "</div>" +
      '<div class="level-badge level-' + App.utils.escapeHtml(cat.difficulty || "") + '">' +
      App.utils.escapeHtml(cat.difficulty || "") + "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function iconHtml(cat) {
    if (!cat.image) return '<div class="cat-icon-fallback">' + App.utils.escapeHtml(cat.icon || "") + "</div>";
    return '<img src="' + cat.image + '" alt="' + App.utils.escapeHtml(cat.title || "") + '" class="cat-card-img" loading="lazy">';
  }

  return { setCategories, findCategory, renderHome };
})();
