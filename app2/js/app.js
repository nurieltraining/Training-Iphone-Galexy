/* app.js — application bootstrap. Loads ONLY categories.json at startup.
   Everything else (lessons, quizzes, search index, images) loads on demand. */
window.App = window.App || {};

App.DEBUG = /[?&]debug=1/.test(window.location.search);

App.debugPanel = (function () {
  let el = null;
  const log = [];

  function ensure() {
    if (el) return el;
    el = document.createElement("div");
    el.id = "debug-panel";
    el.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;max-height:35vh;overflow:auto;" +
      "background:#111;color:#0f0;font:11px monospace;padding:8px;z-index:99999;direction:ltr;text-align:left;";
    document.body.appendChild(el);
    return el;
  }

  function render() {
    if (!App.DEBUG) return;
    ensure().innerHTML = log.slice(-40).map((l) => "<div>" + l + "</div>").join("");
  }

  function logInfo(msg) {
    if (!App.DEBUG) return;
    log.push("[info] " + msg);
    render();
  }

  function logError(where, err) {
    if (!App.DEBUG) return;
    log.push("[ERROR] " + where + ": " + (err && err.message ? err.message : err));
    render();
  }

  return { logInfo, logError };
})();

(function bootstrap() {
  const startTime = performance.now();
  const appRoot = document.getElementById("app");

  window.addEventListener("error", (e) => {
    App.utils && App.utils.logError("window.onerror", e.error || e.message);
    // Never show a blank screen: surface a minimal, friendly recovery message
    // only if the app root is still empty (i.e. we crashed before first render).
    if (appRoot && !appRoot.innerHTML.trim()) {
      appRoot.innerHTML =
        '<div class="load-error">קרתה שגיאה בטעינה. ' +
        '<button onclick="location.reload()">רענון הדף</button></div>';
    }
  });

  async function init() {
    App.debugPanel.logInfo("bootstrap start");
    App.speech.init();

    const categories = await App.loader.getCategories();
    if (!categories) {
      appRoot.innerHTML =
        '<div class="load-error">לא הצלחנו לטעון את רשימת הנושאים. בדקו את החיבור לאינטרנט.' +
        '<button onclick="location.reload()">נסה שוב</button></div>';
      return;
    }
    App.ui.setCategories(categories);
    App.debugPanel.logInfo("categories.json loaded: " + categories.categories.length + " items");

    // Registration gate — independent, non-blocking, and optional (the
    // person can skip it). The app is already usable underneath; the gate
    // is purely an overlay that shows at most once.
    App.utils.safeTry(async () => {
      const show = await App.registration.shouldShowGate();
      if (show) App.gateUI.show();
    });

    App.feedback.mount(document.body);
    App.feedback.setContextProvider(() => App.lesson.currentContextTitle());

    setupRoutes();
    App.router.start();

    App.debugPanel.logInfo("bootstrap done in " + Math.round(performance.now() - startTime) + "ms");
  }

  function setupRoutes() {
    App.router.register("#/", async () => {
      cleanupPreviousLesson();
      await App.ui.renderHome(appRoot);
    });

    App.router.register("#/category/:id", async (params) => {
      const cat = App.ui.findCategory(params.id);
      if (!cat) { App.router.navigate("#/"); return; }
      cleanupPreviousLesson();
      currentCat = cat;
      await App.lesson.render(appRoot, cat);
    });

    App.router.register("#/quiz/:id", async (params) => {
      const cat = App.ui.findCategory(params.id);
      if (!cat || !cat.quizFile) { App.router.navigate("#/"); return; }
      currentCat = cat;
      await App.quiz.render(appRoot, cat);
    });

    App.router.setNotFound(() => App.router.navigate("#/"));
  }

  let currentCat = null;
  function cleanupPreviousLesson() {
    if (currentCat) {
      App.lesson.unload(currentCat);
      App.quiz.unload(currentCat);
      currentCat = null;
    }
  }

  App.utils.safeTry(init, () => {
    appRoot.innerHTML =
      '<div class="load-error">קרתה שגיאה בעת אתחול האפליקציה. <button onclick="location.reload()">רענון</button></div>';
  });
})();
