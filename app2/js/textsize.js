/* textsize.js — lets people enlarge all app text for easier reading. Sets the
   --scale CSS variable that app.css uses on body
   (font-size: calc(18px * var(--scale, 1))).

   The button is rendered INSIDE each screen's header (via buttonHtml()) rather
   than floating over the page — the old fixed-position button covered the
   course tabs on the home screen. One document-level click handler serves
   every copy of the button. */
window.App = window.App || {};

App.textSize = (function () {
  const KEY = "app2-text-scale";
  const LEVELS = [1, 1.2, 1.4]; // normal, large, extra-large
  const LABELS = ["רגיל", "גדול", "גדול מאוד"];
  let level = 0;

  function apply() {
    document.body.style.setProperty("--scale", String(LEVELS[level]));
  }

  async function init() {
    await App.utils.safeTryAsync(async () => {
      const saved = await App.storage.get(KEY);
      const parsed = saved !== null ? parseInt(saved, 10) : 0;
      level = Number.isInteger(parsed) && parsed >= 0 && parsed < LEVELS.length ? parsed : 0;
      apply();
    });
  }

  function label() {
    return "Aa " + LABELS[level];
  }

  function ariaLabel() {
    return "גודל טקסט: " + LABELS[level] + " - לחצו לשינוי";
  }

  function buttonHtml() {
    return (
      '<button type="button" class="textsize-btn" data-textsize="1" aria-label="' +
      ariaLabel() + '">' + label() + "</button>"
    );
  }

  function mount() {
    App.utils.safeTry(() => {
      if (document.body.dataset.textsizeWired) return;
      document.body.dataset.textsizeWired = "1";
      document.addEventListener("click", async (e) => {
        const btn = e.target.closest && e.target.closest("[data-textsize]");
        if (!btn) return;
        e.stopPropagation();
        level = (level + 1) % LEVELS.length;
        apply();
        App.utils.qsa("[data-textsize]").forEach((b) => {
          b.textContent = label();
          b.setAttribute("aria-label", ariaLabel());
        });
        await App.storage.set(KEY, String(level));
      }, true);
    });
  }

  return { init, mount, buttonHtml };
})();
