/* sw.js — service worker: lets the app open with no connection and be added
   to the home screen.

   Strategy (chosen so content fixes reach people immediately when online):
   - App code, pages and lesson/quiz JSON: NETWORK FIRST, with a short timeout
     on slow connections, falling back to the last cached copy offline.
   - Images: CACHE FIRST (they rarely change and are the heaviest files).
   - Requests to other sites (the Google Sheets endpoint) are never touched.

   Bump CACHE_VERSION whenever this file's precache list changes. */
const CACHE_VERSION = "lb-v27";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css?v=27",
  "js/utils.js?v=27",
  "js/storage.js?v=27",
  "js/loader.js?v=27",
  "js/router.js?v=27",
  "js/speech.js?v=27",
  "js/registration.js?v=27",
  "js/gate-ui.js?v=27",
  "js/feedback.js?v=27",
  "js/privacy.js?v=27",
  "js/textsize.js?v=27",
  "js/search.js?v=27",
  "js/sync.js?v=27",
  "js/diagrams.js?v=27",
  "js/lesson.js?v=27",
  "js/quiz.js?v=27",
  "js/instructor.js?v=27",
  "js/ui.js?v=27",
  "js/app.js?v=27",
  "data/categories.json",
  "data/search-index.json",
  "data/syllabus.json",
  "images/logo-nuriel-ai.webp",
  "images/icons/icon-192-v2.png",
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // add one by one so a single missing file can't abort the whole install
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isImage(url) {
  return /\.(webp|png|jpe?g|gif|svg)$/i.test(url.pathname);
}

// Cache key ignores the browser's "no-cache" request mode but keeps the
// query string (the ?v= version on scripts is meaningful).
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const fromNetwork = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res) return res;
  } catch (_e) {
    /* offline — fall through to cache */
  }
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  return fromNetwork; // nothing cached: keep waiting on the network (may still fail)
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept the Sheets endpoint etc.

  if (isImage(url)) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});
