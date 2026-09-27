/* router.js — hash-based navigation. Routes are registered by other modules
   (lesson.js, quiz.js, ui.js) instead of one giant switch statement living here. */
window.App = window.App || {};

App.router = (function () {
  const routes = []; // { pattern: RegExp, paramNames: [...], handler: fn }
  let notFoundHandler = null;
  let currentPath = null;

  function register(pathPattern, handler) {
    // pathPattern examples: "#/", "#/category/:id", "#/quiz/:id"
    // Split by "/" first so ":id" segments are identified before any other
    // character in the pattern gets regex-escaped — doing escaping first
    // (as an earlier version of this function did) means the ":" is never
    // turned into a capture group and dynamic routes silently never match.
    const paramNames = [];
    const regexStr = pathPattern
      .split("/")
      .map((seg) => {
        if (seg.startsWith(":")) {
          paramNames.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    routes.push({ regex: new RegExp("^" + regexStr + "$"), paramNames, handler });
  }

  function setNotFound(handler) {
    notFoundHandler = handler;
  }

  function parseHash() {
    return window.location.hash || "#/";
  }

  function dispatch() {
    const hash = parseHash();
    if (hash === currentPath) return; // avoid duplicate renders on redundant events
    currentPath = hash;

    for (const route of routes) {
      const match = hash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
        // route.handler may be async; catch rejections explicitly so a thrown
        // error inside it (after an await) doesn't vanish as an unhandled
        // promise rejection — safeTry alone only guards the synchronous part.
        Promise.resolve()
          .then(() => route.handler(params))
          .catch((e) => App.utils.logError("router.dispatch(" + hash + ")", e));
        return;
      }
    }
    if (notFoundHandler) App.utils.safeTry(() => notFoundHandler());
  }

  function navigate(path) {
    if (window.location.hash === path) {
      // force a re-dispatch even if the hash didn't change (e.g. re-entering same lesson)
      currentPath = null;
      dispatch();
    } else {
      window.location.hash = path;
    }
  }

  function start() {
    window.addEventListener("hashchange", dispatch);
    dispatch();
  }

  return { register, setNotFound, navigate, start };
})();
