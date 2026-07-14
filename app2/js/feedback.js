/* feedback.js — the floating feedback button + modal. Fully independent:
   it does not run at startup, only when the user opens it, and never
   blocks the rest of the app if sending fails. */
window.App = window.App || {};

App.feedback = (function () {
  function mount(root) {
    App.utils.safeTry(() => {
      const fab = document.createElement("button");
      fab.className = "fb-fab";
      fab.setAttribute("aria-label", "משוב");
      fab.innerHTML = "💬 <span>הערה על הקטגוריה</span>";
      fab.addEventListener("click", () => openModal(root));
      root.appendChild(fab);
    });
  }

  function openModal(root) {
    App.utils.safeTry(() => {
      const existing = App.utils.qs("#fb-modal-instance", root);
      if (existing) { existing.style.display = "flex"; return; }

      const modal = document.createElement("div");
      modal.id = "fb-modal-instance";
      modal.className = "fb-modal";
      modal.innerHTML =
        '<div class="fb-card">' +
        '<p class="fb-title">השאירו הערה</p>' +
        '<p class="fb-context">משוב על: ' + App.utils.escapeHtml(App.router && currentContext ? currentContext() : "") + "</p>" +
        '<textarea class="fb-text" placeholder="ספרו לנו מה עבד טוב, ומה כדאי לשפר..."></textarea>' +
        '<div class="fb-btn-row">' +
        '<button class="fb-send">שליחה</button>' +
        '<button class="fb-cancel">ביטול</button>' +
        "</div>" +
        '<p class="fb-thanks" style="display:none;">תודה על המשוב! 🙏</p>' +
        "</div>";
      root.appendChild(modal);
      modal.style.display = "flex"; // must be set explicitly — CSS default is display:none

      App.utils.qs(".fb-cancel", modal).addEventListener("click", () => (modal.style.display = "none"));
      App.utils.qs(".fb-send", modal).addEventListener("click", () => send(modal));
    });
  }

  let currentContext = null;
  function setContextProvider(fn) {
    currentContext = fn;
  }

  function send(modal) {
    App.utils.safeTry(async () => {
      const text = App.utils.qs(".fb-text", modal).value.trim();
      if (!text) return;

      const info = (await App.registration.getUserInfo()) || {};
      const context = currentContext ? currentContext() : "";

      App.utils.safeTry(() => {
        const params = new URLSearchParams();
        params.append("type", "feedback");
        params.append("firstName", info.first || "");
        params.append("lastName", info.last || "");
        params.append("phone", info.phone || "");
        params.append("context", context);
        params.append("comment", text);
        params.append("appName", App.registration.APP_NAME);
        params.append("deviceType", App.utils.detectDeviceType());
        params.append("timestamp", new Date().toISOString());
        fetch(App.registration.ENDPOINT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }).catch(() => {
          /* network failure must never affect the app */
        });
      });

      App.utils.qs(".fb-thanks", modal).style.display = "block";
      App.utils.qs(".fb-text", modal).style.display = "none";
      App.utils.qs(".fb-btn-row", modal).style.display = "none";
      setTimeout(() => {
        modal.style.display = "none";
        App.utils.qs(".fb-text", modal).value = "";
        App.utils.qs(".fb-thanks", modal).style.display = "none";
        App.utils.qs(".fb-text", modal).style.display = "block";
        App.utils.qs(".fb-btn-row", modal).style.display = "flex";
      }, 1800);
    });
  }

  return { mount, setContextProvider };
})();
