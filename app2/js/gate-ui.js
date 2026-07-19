/* gate-ui.js — presentation layer for the registration overlay.
   Purely a UI shell over App.registration; the app underneath is already
   fully functional even if this never shows (e.g. storage unavailable). */
window.App = window.App || {};

App.gateUI = (function () {
  function show() {
    App.utils.safeTry(() => {
      const gate = document.getElementById("gate");
      if (!gate) return;
      gate.style.display = "flex";
      wire(gate);
    });
  }

  function hide() {
    App.utils.safeTry(() => {
      const gate = document.getElementById("gate");
      if (gate) gate.style.display = "none";
    });
  }

  function emailLooksValid(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
  }

  function wire(gate) {
    const submitBtn = App.utils.qs("#g-submit", gate);
    const skipBtn = App.utils.qs("#g-skip", gate);
    if (skipBtn && !skipBtn.dataset.wired) {
      skipBtn.dataset.wired = "1";
      skipBtn.addEventListener("click", async () => {
        await App.registration.skipRegistration();
        hide();
      });
    }
    if (!submitBtn || submitBtn.dataset.wired) return; // avoid double-binding
    submitBtn.dataset.wired = "1";
    submitBtn.addEventListener("click", async () => {
      const info = {
        first: App.utils.qs("#g-first", gate)?.value.trim() || "",
        last: App.utils.qs("#g-last", gate)?.value.trim() || "",
        phone: App.utils.qs("#g-phone", gate)?.value.trim() || "",
        email: App.utils.qs("#g-email", gate)?.value.trim() || "",
        city: App.utils.qs("#g-city", gate)?.value.trim() || "",
        org: App.utils.qs("#g-org", gate)?.value.trim() || "",
      };
      const errorEl = App.utils.qs("#g-error", gate);
      const valid = info.first && info.last && info.phone && emailLooksValid(info.email) && info.city && info.org;
      if (!valid) {
        if (errorEl) { errorEl.textContent = "נא למלא את כל השדות (כולל אימייל תקין)"; errorEl.style.display = "block"; }
        return;
      }
      if (errorEl) errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.textContent = "שולח...";
      const ok = await App.registration.saveRegistration(info);
      submitBtn.disabled = false;
      submitBtn.textContent = "כניסה לאפליקציה";
      if (ok) {
        hide();
      } else if (errorEl) {
        errorEl.textContent = "משהו השתבש בשמירה - נסו שוב בבקשה";
        errorEl.style.display = "block";
      }
    });
  }

  return { show, hide };
})();
