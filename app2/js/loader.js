/* loader.js — fetches JSON on demand. Nothing is preloaded except categories.json.
   Simple in-memory cache so re-visiting a lesson doesn't refetch, but the cache
   is intentionally NOT the whole app's content — only what the user has opened
   this session. */
window.App = window.App || {};

App.loader = (function () {
  const cache = new Map();
  const DATA_ROOT = "data/";

  async function fetchJSON(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath);

    const url = DATA_ROOT + relativePath;
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      const json = await res.json();
      cache.set(relativePath, json);
      return json;
    } catch (e) {
      App.utils.logError("loader.fetchJSON(" + relativePath + ")", e);
      return null;
    }
  }

  function clearLesson(relativePath) {
    // Explicit unload — called when the user leaves a lesson, per the
    // "unload previous lesson if possible" requirement. Categories.json and
    // the search index are deliberately never cleared.
    cache.delete(relativePath);
  }

  async function getCategories() {
    return fetchJSON("categories.json");
  }

  async function getLesson(relativeLessonFile) {
    return fetchJSON(relativeLessonFile);
  }

  async function getQuiz(relativeQuizFile) {
    return fetchJSON(relativeQuizFile);
  }

  async function getSearchIndex() {
    return fetchJSON("search-index.json");
  }

  return { getCategories, getLesson, getQuiz, getSearchIndex, clearLesson };
})();
