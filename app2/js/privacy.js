/* privacy.js — a simple, always-available privacy notice. Read-only: no
   network calls, no storage writes. Mounted once at startup, like feedback.js. */
window.App = window.App || {};

App.privacy = (function () {
  function mount(root) {
    App.utils.safeTry(() => {
      // No floating link any more (it overlapped the feedback button and
      // covered cards). Any element with data-privacy — e.g. the link in the
      // home screen footer — opens the notice.
      if (root.dataset.privacyWired) return;
      root.dataset.privacyWired = "1";
      document.addEventListener("click", (e) => {
        if (e.target.closest && e.target.closest("[data-privacy]")) openModal(root);
      });
    });
  }

  function openModal(root) {
    App.utils.safeTry(() => {
      const existing = App.utils.qs("#privacy-modal-instance", root);
      if (existing) { existing.style.display = "flex"; App.utils.qs(".fb-send", existing)?.focus(); return; }

      const modal = document.createElement("div");
      modal.id = "privacy-modal-instance";
      modal.className = "fb-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "פרטיות ומידע אישי");
      modal.innerHTML =
        '<div class="fb-card privacy-card">' +
        '<p class="fb-title">פרטיות ומידע אישי</p>' +
        '<div class="privacy-body">' +
        "<p><strong>מה נאסף:</strong> אם תבחרו להירשם, נשמרים שם, טלפון, אימייל, עיר ושם מסגרת - רק כדי שנוכל לדעת מי משתמש באפליקציה ולחזור אליכם אם תשאירו הערה או שאלה. אפשר לדלג על ההרשמה לגמרי ולהמשיך להשתמש באפליקציה במלואה.</p>" +
        "<p><strong>שימוש באפליקציה:</strong> אנחנו רושמים בצורה כללית אילו שיעורים נפתחים ואילו שלבים מסומנים כ'נלמד', כדי להבין אילו נושאים עוזרים ואילו קשים להבנה - ולשפר את התוכן בהתאם. זה לא כולל מעקב אחר מיקום או תוכן פרטי אחר במכשיר. לכל ביקור מצורף מזהה אקראי זמני (לא שמור במכשיר ולא קשור לשם או לטלפון), כדי שנוכל להבין רצף שימוש.</p>" +
        "<p><strong>שמירת ההתקדמות:</strong> אם נרשמתם, רשימת השלבים שסימנתם וציוני החידונים נשמרים בגיליון יחד עם הטלפון והאימייל, כדי שתוכלו לשחזר אותם במכשיר חדש.</p>" +
        "<p><strong>הערות ומשוב:</strong> אם תשלחו הערה, שאלה או הצעה דרך הכפתור הצף, היא מגיעה יחד עם הפרטים שנרשמו (אם נרשמתם), כדי שנוכל להתייחס אליה ולחזור אליכם במידת הצורך.</p>" +
        "<p><strong>איפה זה נשמר:</strong> כל המידע נשמר בגיליון Google Sheets פרטי, נגיש רק לצוות שמפעיל את הקורס - לא משותף עם צד שלישי ולא נמכר לאף אחד.</p>" +
        "<p><strong>שאלות?</strong> אפשר לפנות אלינו בכל עת דרך כפתור 'שאלה? הערה? הצעה?', או במייל לכתובת <a href=\"mailto:nuriel.training@gmail.com\">nuriel.training@gmail.com</a>, ולבקש לעדכן או למחוק את הפרטים שלכם.</p>" +
        "</div>" +
        '<div class="fb-btn-row">' +
        '<button type="button" class="fb-send" data-action="close-privacy">סגירה</button>' +
        "</div>" +
        "</div>";
      root.appendChild(modal);
      modal.style.display = "flex";
      App.utils.qs(".fb-send", modal)?.focus();
      modal.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });

      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest('[data-action="close-privacy"]')) {
          modal.style.display = "none";
        }
      });
    });
  }

  return { mount };
})();
