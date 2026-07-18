/* registration.js — the optional sign-up gate. Runs independently of app
   startup: if the registration endpoint is unreachable, or storage fails,
   the rest of the application keeps working regardless. */
window.App = window.App || {};

App.registration = (function () {
  const REG_KEY = "app2-registered";
  const SKIP_KEY = "app2-registration-skipped";
  const USER_INFO_KEY = REG_KEY + "-userinfo";
  // Same Google Apps Script Web App used by the original single-file apps —
  // registrations/feedback keep landing in the same Google Sheet as before.
  const ENDPOINT_URL =
    "https://script.google.com/macros/s/AKfycbwo94E4ri0aT5vf48c52sgrwkyJu49lsRzp8Bn0iRQRBE5sNNFGjHsR-sWGqTuj5YVqxA/exec";
  const APP_NAME = "לומדים-בקלות (מאוחד)";

  // Registration is optional: the gate should only be shown once (either
  // filled in, or explicitly skipped) — never nag the user again after that.
  async function shouldShowGate() {
    return App.utils.safeTry(async () => {
      const registered = (await App.storage.get(REG_KEY)) === "1";
      const skipped = (await App.storage.get(SKIP_KEY)) === "1";
      return !registered && !skipped;
    }, false); // if storage itself is unavailable, never block the app on the gate
  }

  async function isRegistered() {
    return App.utils.safeTry(async () => {
      const val = await App.storage.get(REG_KEY);
      return val === "1";
    }, false);
  }

  async function saveRegistration(info) {
    try {
      // Write the user's details FIRST, and confirm they actually landed in
      // storage, before marking the visitor as "registered". If this order
      // were reversed and the second write silently failed (slow device,
      // storage hiccup, tab closed mid-write), the app would treat the
      // visitor as a known registered user forever while holding no details
      // for them at all — every future comment would arrive with no name/
      // phone attached, and there would be no way to fix it retroactively.
      await App.storage.setJSON(USER_INFO_KEY, info);
      const verify = await App.storage.getJSON(USER_INFO_KEY, null);
      if (!verify || !verify.phone) {
        App.utils.logError("saveRegistration", new Error("user info did not persist — registration flag NOT set, gate will show again next time"));
        return false; // do not set REG_KEY — better to ask again than to lose the person silently
      }
      await App.storage.set(REG_KEY, "1");
      sendToEndpoint(info); // fire-and-forget, never blocks UI
      return true;
    } catch (e) {
      App.utils.logError("saveRegistration", e);
      return false;
    }
  }

  async function skipRegistration() {
    return App.utils.safeTry(async () => {
      await App.storage.set(SKIP_KEY, "1");
      return true;
    }, false);
  }

  function sendToEndpoint(info) {
    App.utils.safeTry(() => {
      const params = new URLSearchParams();
      params.append("firstName", info.first || "");
      params.append("lastName", info.last || "");
      params.append("phone", info.phone || "");
      params.append("email", info.email || "");
      params.append("city", info.city || "");
      params.append("org", info.org || "");
      params.append("deviceType", App.utils.detectDeviceType());
      params.append("appName", APP_NAME);
      params.append("timestamp", new Date().toISOString());
      fetch(ENDPOINT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }).catch(() => {
        /* network failure must never affect the app */
      });
    });
  }

  async function getUserInfo() {
    return App.utils.safeTry(() => App.storage.getJSON(USER_INFO_KEY, null), null);
  }

  function pingVisit(area) {
    return App.utils.safeTry(() => {
      const params = new URLSearchParams();
      params.append("type", "visit");
      params.append("appName", APP_NAME);
      params.append("deviceType", App.utils.detectDeviceType());
      params.append("area", area || "בית");
      fetch(ENDPOINT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }).catch(() => {}); // silent — a visit ping must never affect the app
      return true;
    }, false);
  }

  // Analytics: which quiz questions people get wrong, and what their score
  // was — so content that consistently confuses people can be found and
  // improved, instead of guessing. Same silent, fire-and-forget pattern as
  // pingVisit: never blocks the UI, never surfaces an error to the person.
  // NOTE: the Google Apps Script endpoint itself also needs to recognize
  // "type=quiz_result" and log it to its own sheet/tab — that backend script
  // is outside this repo, so this only covers the sending side.
  function pingQuizResult(area, score, total, wrongQuestionTitles) {
    return App.utils.safeTry(() => {
      const params = new URLSearchParams();
      params.append("type", "quiz_result");
      params.append("appName", APP_NAME);
      params.append("deviceType", App.utils.detectDeviceType());
      params.append("area", area || "");
      params.append("score", String(score));
      params.append("total", String(total));
      params.append("wrongQuestions", (wrongQuestionTitles || []).join(" | "));
      fetch(ENDPOINT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }).catch(() => {});
      return true;
    }, false);
  }

  // Analytics: which lesson steps people actually mark as "learned" — a
  // rough proxy for how far into a lesson people engage before dropping off.
  // Same caveat as above: needs matching "type=lesson_step" handling in the
  // Apps Script backend to land in its own sheet/tab.
  function pingStepEngagement(area, stepIndex, stepTitle, marked) {
    return App.utils.safeTry(() => {
      const params = new URLSearchParams();
      params.append("type", "lesson_step");
      params.append("appName", APP_NAME);
      params.append("deviceType", App.utils.detectDeviceType());
      params.append("area", area || "");
      params.append("stepIndex", String(stepIndex));
      params.append("stepTitle", stepTitle || "");
      params.append("marked", marked ? "learned" : "unlearned");
      fetch(ENDPOINT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }).catch(() => {});
      return true;
    }, false);
  }

  return {
    isRegistered, shouldShowGate, saveRegistration, skipRegistration, getUserInfo,
    pingVisit, pingQuizResult, pingStepEngagement, ENDPOINT_URL, APP_NAME
  };
})();
