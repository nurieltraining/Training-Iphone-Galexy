/* utils.js — small shared helpers. No dependencies on other modules. */
window.App = window.App || {};

App.utils = (function () {
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function safeTry(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      App.utils.logError("safeTry", e);
      return typeof fallback === "function" ? fallback(e) : fallback;
    }
  }

  function logError(where, err) {
    // Never throw from here. Debug-mode aware (see app.js DEBUG flag).
    try {
      if (window.App && App.DEBUG) {
        console.error("[App error]", where, err);
      }
      if (window.App && App.debugPanel) {
        App.debugPanel.logError(where, err);
      }
    } catch (_e) {
      /* swallow — logging must never crash the app */
    }
  }

  function detectDeviceType() {
    return App.utils.safeTry(() => {
      const ua = (navigator.userAgent || "") + " " + (navigator.platform || "");
      if (/iPhone/i.test(ua)) return "iPhone";
      if (/iPad/i.test(ua)) return "iPad";
      if (/Android/i.test(ua)) {
        if (/SM-|Samsung|GT-/i.test(ua)) return "Galaxy/Samsung (טלפון)";
        return "Android אחר (טלפון/טאבלט)";
      }
      if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "iPad (מצב שולחני)";
      if (/Windows|Macintosh|Linux/i.test(ua)) return "מחשב שולחני/נייד";
      return "לא זוהה";
    }, "לא זוהה");
  }

  return { escapeHtml, qs, qsa, debounce, safeTry, logError, detectDeviceType };
})();
