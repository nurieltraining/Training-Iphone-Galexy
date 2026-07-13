/* search.js — searches a small prebuilt JSON index (data/search-index.json),
   generated from lesson content at migration/build time. This is the resolution
   to a real tension in the spec: "never preload all lessons" vs "search must
   find lesson content" — solved by indexing titles + short snippets only,
   not full lesson bodies, so the index stays small and is loaded once,
   lazily, on first search rather than at startup. */
window.App = window.App || {};

App.search = (function () {
  let index = null;
  let loading = null;

  async function ensureIndex() {
    if (index) return index;
    if (loading) return loading;
    loading = App.loader.getSearchIndex().then((data) => {
      index = data || [];
      return index;
    });
    return loading;
  }

  async function query(text) {
    const q = (text || "").trim().toLowerCase();
    if (!q) return [];
    const idx = await ensureIndex();
    return idx
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.catTitle.toLowerCase().includes(q) ||
          (entry.snippet && entry.snippet.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }

  return { query, ensureIndex };
})();
