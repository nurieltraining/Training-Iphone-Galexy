/* registration.js — the optional sign-up gate. Runs independently of app
   startup: if the registration endpoint is unreachable, or storage fails,
   the rest of the application keeps working regardless. */
window.App = window.App || {};

App.registration = (function () {
  const REG_KEY = "app2-registered";
  const USER_INFO_KEY = REG_KEY + "-userinfo";
  // Same Google Apps Script Web App used by the original single-file apps —
  // registrations/feedback keep landing in the same Google Sheet as before.
  const ENDPOINT_URL =
    "https://script.google.com/macros/s/AKfycbzpAaCYi-9SvEGc2Cxqk2jaJNjMGME37mD4TWz8VA7Om9yIg6C8Mv7NeTfcOQUc5oKyLA/exec";
  const APP_NAME = "לומדים-בקלות (מאוחד)";

  async function isRegistered() {
    return App.utils.safeTry(async () => {
      const val = await App.storage.get(REG_KEY);
      return val === "1";
    }, false);
  }

  async function saveRegistration(info) {
    return App.utils.safeTry(async () => {
      await App.storage.set(REG_KEY, "1");
      await App.storage.setJSON(USER_INFO_KEY, info);
      sendToEndpoint(info); // fire-and-forget, never blocks UI
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

  return { isRegistered, saveRegistration, getUserInfo, ENDPOINT_URL, APP_NAME };
})();
