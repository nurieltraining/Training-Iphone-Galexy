/* textsize.js — lets people enlarge all app text for easier reading. Wires up
   the --scale CSS variable that app.css already expects on body
   (font-size: calc(16px * var(--scale, 1))) but that nothing was setting yet. */
window.App = window.App || {};

App.textSize = (function () {
  const KEY = "app2-text-scale";
  const LEVELS = [1, 1.15, 1.3]; // normal, large, extra-large
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

  function mount(root) {
    App.utils.safeTry(() => {
      if (App.utils.qs("#textsize-btn-instance", root)) return;
      const btn = document.createElement("button");
      btn.id = "textsize-btn-instance";
      btn.className = "textsize-btn";
      updateLabel(btn);
      btn.addEventListener("click", async () => {
        level = (level + 1) % LEVELS.length;
        apply();
        updateLabel(btn);
        await App.storage.set(KEY, String(level));
      });
      root.appendChild(btn);
    });
  }

  function updateLabel(btn) {
    btn.textContent = "Aa " + LABELS[level];
    btn.setAttribute("aria-label", "גודל טקסט: " + LABELS[level] + " - לחצו להגדלה");
  }

  return { init, mount };
})();
