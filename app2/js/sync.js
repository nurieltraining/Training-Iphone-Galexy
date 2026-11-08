/* sync.js — keeps a registered person's progress safe across phones.
   Progress normally lives only in this browser (localStorage), so a new
   phone or a cleared browser meant starting over. Now:
   - after every change, registered users' progress is backed up (debounced)
     to the same Google Sheet endpoint, keyed by phone + email;
   - "move progress to a new device" restores it by phone + email and MERGES
     it with what is on this device (a step learned anywhere stays learned;
     the best quiz score wins), so nothing is ever lost by restoring.
   Sent in the request BODY (never in the URL). Fails silently - the app
   never depends on the network for this. Needs the matching backend
   (google_apps_script/Code.gs: types progress_sync / progress_get). */
window.App = window.App || {};

App.sync = (function () {
  const LEARNED = "app2-learned";
  const SCORES = "app2-quiz-scores";
  const LAST_CAT = "app2-last-cat";
  const LAST_SYNC = "app2-last-sync";
  let timer = null;
  let ready = null; // Promise<boolean>: is the v26+ backend (with progress sync) installed?

  // The older Sheets script has no progress support and would log a sync
  // request as an empty row, so sync only runs when the endpoint identifies
  // itself as the new backend (its doGet replies {"app":"lomdim-bekalut"}).
  function backendReady() {
    if (!ready) {
      ready = fetch(App.registration.ENDPOINT_URL)
        .then((r) => r.json())
        .then((j) => !!(j && j.app === "lomdim-bekalut"))
        .catch(() => false);
    }
    return ready;
  }

  function norm(phone, email) {
    return {
      phone: String(phone || "").replace(/[^\d]/g, ""),
      email: String(email || "").trim().toLowerCase(),
    };
  }

  async function snapshot() {
    return {
      learned: await App.storage.getJSON(LEARNED, {}),
      scores: await App.storage.getJSON(SCORES, {}),
      lastCat: await App.storage.getJSON(LAST_CAT, {}),
      updated: new Date().toISOString(),
    };
  }

  function post(payload) {
    // text/plain keeps this a "simple" request (no CORS preflight), which the
    // Apps Script web app accepts; its JSON reply is readable cross-origin.
    return fetch(App.registration.ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  }

  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(() => App.utils.safeTryAsync(push), 4000);
  }

  async function push() {
    const info = await App.registration.getUserInfo();
    if (!info || !info.phone || !info.email) return false; // only registered users
    if (!(await backendReady())) return false;
    const id = norm(info.phone, info.email);
    const data = await snapshot();
    await post({ type: "progress_sync", phone: id.phone, email: id.email, appName: App.registration.APP_NAME, progress: data })
      .catch(() => null);
    await App.storage.set(LAST_SYNC, data.updated);
    return true;
  }

  function merge(local, remote) {
    const learned = Object.assign({}, remote.learned || {}, local.learned || {});
    const scores = Object.assign({}, remote.scores || {});
    Object.keys(local.scores || {}).forEach((k) => { scores[k] = Math.max(scores[k] || 0, local.scores[k]); });
    const lastCat = Object.assign({}, remote.lastCat || {}, local.lastCat || {});
    return { learned, scores, lastCat };
  }

  // Returns { ok, steps } or { ok:false, reason }
  async function restore(phone, email) {
    const id = norm(phone, email);
    if (id.phone.length < 9 || id.email.indexOf("@") < 1) return { ok: false, reason: "details" };
    if (!(await backendReady())) return { ok: false, reason: "backend" };
    let res;
    try {
      const r = await post({ type: "progress_get", phone: id.phone, email: id.email });
      res = await r.json();
    } catch (_e) {
      return { ok: false, reason: "network" };
    }
    if (!res || !res.ok || !res.progress) return { ok: false, reason: "notfound" };
    const merged = merge(await snapshot(), res.progress);
    await App.storage.setJSON(LEARNED, merged.learned);
    await App.storage.setJSON(SCORES, merged.scores);
    await App.storage.setJSON(LAST_CAT, merged.lastCat);
    return { ok: true, steps: Object.keys(merged.learned).length };
  }

  // ---- "move progress to a new device" dialog -------------------------
  function mount(root) {
    App.utils.safeTry(() => {
      if (root.dataset.syncWired) return;
      root.dataset.syncWired = "1";
      document.addEventListener("click", (e) => {
        if (e.target.closest && e.target.closest("[data-sync]")) openModal(root);
      });
    });
  }

  async function openModal(root) {
    const old = App.utils.qs("#sync-modal-instance", root);
    if (old) old.remove();
    const info = (await App.registration.getUserInfo()) || {};
    const last = await App.storage.get(LAST_SYNC);
    const registered = !!(info.phone && info.email);
    const esc = App.utils.escapeHtml;
    const modal = document.createElement("div");
    modal.id = "sync-modal-instance";
    modal.className = "fb-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "שמירת ההתקדמות");
    modal.innerHTML =
      '<div class="fb-card">' +
      '<p class="fb-title">🔄 ההתקדמות שלי בכל מכשיר</p>' +
      (registered
        ? '<p class="sync-text">ההתקדמות שלכם נשמרת אוטומטית' + (last ? " (לאחרונה: " + esc(new Date(last).toLocaleString("he-IL")) + ")" : "") + ".</p>"
        : '<p class="sync-text">כדי שההתקדמות תישמר אוטומטית, צריך להירשם באפליקציה (מספר טלפון ואימייל).</p>') +
      '<p class="sync-text">במכשיר חדש? הקלידו את הטלפון והאימייל שאיתם נרשמתם, וההתקדמות תחזור. שום דבר לא יימחק - שלבים שלמדתם בכל מכשיר נשארים מסומנים.</p>' +
      '<div class="gate-field"><label for="sync-phone">מספר טלפון</label><input id="sync-phone" type="tel" inputmode="tel" dir="ltr" value="' + esc(info.phone || "") + '"></div>' +
      '<div class="gate-field"><label for="sync-email">אימייל</label><input id="sync-email" type="email" inputmode="email" dir="ltr" value="' + esc(info.email || "") + '"></div>' +
      '<p class="sync-status" role="status"></p>' +
      '<div class="fb-btn-row"><button type="button" class="fb-send" data-act="restore">שחזור ההתקדמות</button>' +
      '<button type="button" class="fb-cancel" data-act="close">סגירה</button></div></div>';
    root.appendChild(modal);
    modal.style.display = "flex";
    const status = App.utils.qs(".sync-status", modal);
    modal.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.remove(); });
    modal.addEventListener("click", async (e) => {
      if (e.target === modal || e.target.closest('[data-act="close"]')) { modal.remove(); return; }
      if (!e.target.closest('[data-act="restore"]')) return;
      status.textContent = "בודקים...";
      const r = await restore(App.utils.qs("#sync-phone", modal).value, App.utils.qs("#sync-email", modal).value);
      if (r.ok) {
        status.textContent = "✓ ההתקדמות שוחזרה (" + r.steps + " שלבים מסומנים).";
        if ((location.hash || "#/") === "#/") App.router.navigate("#/");
      } else {
        status.textContent = {
          details: "נא להקליד טלפון ואימייל מלאים.",
          network: "אין חיבור כרגע - נסו שוב כשיש אינטרנט.",
          notfound: "לא נמצאה התקדמות שמורה עם הפרטים האלה. ודאו שאלה אותם פרטים שאיתם נרשמתם.",
          backend: "שמירת ההתקדמות עדיין לא הופעלה במערכת. נסו שוב בהמשך.",
        }[r.reason] || "משהו השתבש - נסו שוב.";
      }
    });
    App.utils.qs("#sync-phone", modal).focus();
  }

  return { schedulePush, push, restore, mount };
})();
