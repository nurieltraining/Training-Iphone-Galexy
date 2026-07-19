/* privacy.js — a simple, always-available privacy notice. Read-only: no
   network calls, no storage writes. Mounted once at startup, like feedback.js. */
window.App = window.App || {};

App.privacy = (function () {
  function mount(root) {
    App.utils.safeTry(() => {
      if (App.utils.qs("#privacy-link-instance", root)) return; // avoid double-mount

      const link = document.createElement("button");
      link.id = "privacy-link-instance";
      link.className = "privacy-link";
      link.textContent = "🔒 פרטיות";
      link.addEventListener("click", () => openModal(root));
      root.appendChild(link);
    });
  }

  function openModal(root) {
    App.utils.safeTry(() => {
      const existing = App.utils.qs("#privacy-modal-instance", root);
      if (existing) { existing.style.display = "flex"; return; }

      const modal = document.createElement("div");
      modal.id = "privacy-modal-instance";
      modal.className = "fb-modal";
      modal.innerHTML =
        '<div class="fb-card privacy-card">' +
        '<p class="fb-title">פרטיות ומידע אישי</p>' +
        '<div class="privacy-body">' +
        "<p><strong>מה נאסף:</strong> אם תבחרו להירשם, נשמרים שם, טלפון, אימייל, עיר ושם מסגרת - רק כדי שנוכל לדעת מי משתמש באפליקציה ולחזור אליכם אם תשאירו הערה או שאלה. אפשר לדלג על ההרשמה לגמרי ולהמשיך להשתמש באפליקציה במלואה.</p>" +
        "<p><strong>שימוש באפליקציה:</strong> אנחנו רושמים בצורה כללית אילו שיעורים נפתחים ואילו שלבים מסומנים כ'נלמד', כדי להבין אילו נושאים עוזרים ואילו קשים להבנה - ולשפר את התוכן בהתאם. זה לא כולל מעקב אחר מיקום או תוכן פרטי אחר במכשיר.</p>" +
        "<p><strong>הערות ומשוב:</strong> אם תשלחו הערה, שאלה או הצעה דרך הכפתור הצף, היא מגיעה יחד עם הפרטים שנרשמו (אם נרשמתם), כדי שנוכל להתייחס אליה ולחזור אליכם במידת הצורך.</p>" +
        "<p><strong>איפה זה נשמר:</strong> כל המידע נשמר בגיליון Google Sheets פרטי, נגיש רק לצוות שמפעיל את הקורס - לא משותף עם צד שלישי ולא נמכר לאף אחד.</p>" +
        "<p><strong>שאלות?</strong> אפשר לפנות אלינו בכל עת דרך כפתור 'שאלה? הערה? הצעה?' ולבקש לעדכן או למחוק את הפרטים שלכם.</p>" +
        "</div>" +
        '<div class="fb-btn-row">' +
        '<button class="fb-send" data-action="close-privacy">סגירה</button>' +
        "</div>" +
        "</div>";
      root.appendChild(modal);
      modal.style.display = "flex";

      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest('[data-action="close-privacy"]')) {
          modal.style.display = "none";
        }
      });
    });
  }

  return { mount };
})();
