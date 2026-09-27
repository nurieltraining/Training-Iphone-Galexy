/* storage.js — independent persistence module.
   Tries window.storage (Claude artifact preview), falls back to localStorage,
   falls back to an in-memory object if both are unavailable (e.g. private
   browsing on some old browsers). Never throws. */
window.App = window.App || {};

App.storage = (function () {
  const memoryFallback = {};
  let mode = "memory";

  function detectMode() {
    return App.utils.safeTry(() => {
      if (typeof window.storage !== "undefined" && window.storage) return "artifact";
      if (typeof window.localStorage !== "undefined") {
        const testKey = "__app_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return "local";
      }
      return "memory";
    }, "memory");
  }

  mode = detectMode();

  async function get(key) {
    return App.utils.safeTryAsync(async () => {
      if (mode === "artifact") {
        const res = await window.storage.get(key, false);
        return res ? res.value : null;
      }
      if (mode === "local") {
        return window.localStorage.getItem(key);
      }
      return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : null;
    }, null);
  }

  async function set(key, value) {
    return App.utils.safeTryAsync(async () => {
      if (mode === "artifact") {
        await window.storage.set(key, value, false);
        return true;
      }
      if (mode === "local") {
        window.localStorage.setItem(key, value);
        return true;
      }
      memoryFallback[key] = value;
      return true;
    }, false);
  }

  async function getJSON(key, fallback) {
    const raw = await get(key);
    if (!raw) return fallback;
    return App.utils.safeTry(() => JSON.parse(raw), fallback);
  }

  async function setJSON(key, obj) {
    return set(key, App.utils.safeTry(() => JSON.stringify(obj), "{}"));
  }

  function getMode() {
    return mode;
  }

  return { get, set, getJSON, setJSON, getMode };
})();
