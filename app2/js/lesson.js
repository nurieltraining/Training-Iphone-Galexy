/* lesson.js — renders a single lesson (category) page, matching the original
   app's exact UX: expandable step cards, mini-step splitting on ">", a
   learn/speak button row, and per-category diagrams. Loads only its own
   JSON file on demand via loader.js. */
window.App = window.App || {};

App.lesson = (function () {
  const LEARNED_KEY = "app2-learned"; // { [catId-stepIdx]: true }
  let currentLessonId = null;
  let currentLessonTitle = "מסך ראשי";
  let openSteps = {}; // local UI state, not persisted — matches original session-only "open" behavior

  async function render(root, catMeta) {
    currentLessonId = catMeta.id;
    currentLessonTitle = catMeta.title;
    root.innerHTML = '<div class="loading-note">טוען...</div>';

    const lesson = await App.loader.getLesson(catMeta.lessonFile);
    if (!lesson) {
      root.innerHTML =
        '<div class="load-error">לא הצלחנו לטעון את השיעור הזה כרגע. בדקו את החיבור לאינטרנט ונסו שוב.' +
        '<button class="btn" data-action="retry-lesson">נסה שוב</button></div>';
      App.utils.qs('[data-action="retry-lesson"]', root)?.addEventListener("click", () => render(root, catMeta));
      return;
    }

    const learned = await App.storage.getJSON(LEARNED_KEY, {});
    draw(root, catMeta, lesson, learned);
  }

  function learnedCountFor(catId, stepCount, learned) {
    let n = 0;
    for (let i = 0; i < stepCount; i++) if (learned[catId + "-" + i]) n++;
    return n;
  }

  function draw(root, catMeta, lesson, learned) {
    const lc = learnedCountFor(catMeta.id, lesson.steps.length, learned);
    const pc = lesson.steps.length ? Math.round((lc / lesson.steps.length) * 100) : 0;

    root.innerHTML =
      '<header class="top">' +
      '<div class="top-row"><button class="back-btn" data-action="go-home">→ כל הנושאים</button></div>' +
      '<div class="cat-title"><span class="cat-icon-big">' + iconHtml(catMeta) + "</span>" +
      App.utils.escapeHtml(lesson.title) + "</div>" +
      '<div class="progress-track"><div class="progress-fill" style="width:' + pc + '%"></div></div>' +
      '<p class="cat-progress-line" style="margin-top:6px;">' + lc + " מתוך " + lesson.steps.length + " שלבים נלמדו</p>" +
      "</header>" +
      "<main>" +
      (catMeta.id === "meetiphone" || catMeta.id === "meetgalaxy" ? App.diagrams.forCategory(catMeta.id) : "") +
      lesson.steps.map((s, i) => stepHtml(catMeta.id, s, i, learned)).join("") +
      '<p class="disclaimer">סיימתם את כל השלבים? חזרו לרשימת הנושאים ובחרו את הבא בתור.</p>' +
      (catMeta.quizFile
        ? '<button class="btn quiz-start-btn" data-action="start-quiz" data-cat="' + catMeta.id + '">📝 בואו נראה מה זכרתם</button>'
        : "") +
      "</main>";

    wireEvents(root, catMeta, lesson, learned);
  }

  function iconHtml(catMeta) {
    if (!catMeta.image) return App.utils.escapeHtml(catMeta.icon || "");
    return '<img src="' + catMeta.image + '" alt="" class="cat-icon-img" loading="lazy">';
  }

  function splitMiniSteps(body) {
    if (body.indexOf(">") === -1) return null;
    return body.split(">").map((s) => s.trim()).filter(Boolean);
  }

  function stepBodyHtml(body) {
    const parts = splitMiniSteps(body);
    if (!parts) return '<p class="step-text">' + App.utils.escapeHtml(body) + "</p>";
    return (
      '<ol class="mini-steps">' +
      parts.map((p, i) => '<li><span class="mini-num">' + (i + 1) + "</span><span>" + App.utils.escapeHtml(p) + "</span></li>").join("") +
      "</ol>"
    );
  }

  function stepSpeechText(step) {
    const parts = splitMiniSteps(step.text);
    if (!parts) return step.title + ". " + step.text;
    let out = step.title + ". ";
    parts.forEach((p, i) => (out += "שלב " + (i + 1) + ": " + p + ". "));
    return out;
  }

  function warnBoxHtml(text) {
    return '<div class="warn-box"><span class="warn-ic">⚠️</span><span>' + App.utils.escapeHtml(text) + "</span></div>";
  }

  function stepHtml(catId, step, i, learned) {
    const key = catId + "-" + i;
    const isOpen = !!openSteps[key];
    const isLearned = !!learned[key];
    const isSpeaking = App.speech.getSpeakingKey() === key;
    const canSpeak = App.speech.isSupported() && App.speech.hasHebrewVoice();
    return (
      '<div class="step-card ' + (isOpen ? "open" : "") + " " + (isLearned ? "learned" : "") + '">' +
      '<div class="step-head" data-action="toggle-open" data-idx="' + i + '">' +
      '<div class="step-num">' + (isLearned ? "✓" : i + 1) + "</div>" +
      '<div class="step-title">' + App.utils.escapeHtml(step.title) + "</div>" +
      '<div class="chev">▾</div>' +
      "</div>" +
      '<div class="step-body"><div class="step-body-inner">' +
      stepBodyHtml(step.text) +
      (step.warning ? warnBoxHtml(step.warning) : "") +
      '<div class="btn-row">' +
      (canSpeak
        ? '<button class="btn btn-read ' + (isSpeaking ? "speaking" : "") + '" data-action="speak" data-idx="' + i + '">' +
          (isSpeaking ? "⏹ עוצרים" : "🔊 הקריאו לי את זה") +
          "</button>"
        : '<button class="btn btn-read" disabled title="במכשיר הזה אין קול הקראה בעברית מותקן">🔇 הקראה לא זמינה במכשיר זה</button>') +
      '<button class="btn btn-learn ' + (isLearned ? "on" : "") + '" data-action="toggle-learned" data-idx="' + i + '">' +
      (isLearned ? "✓ סימנו שלמדתי" : "סמנו שלמדתי") +
      "</button>" +
      "</div></div></div></div>"
    );
  }

  function wireEvents(root, catMeta, lesson, learned) {
    root.onclick = async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const action = el.getAttribute("data-action");
      const idx = el.hasAttribute("data-idx") ? +el.getAttribute("data-idx") : null;
      const key = idx !== null ? catMeta.id + "-" + idx : null;

      if (action === "go-home") {
        App.router.navigate("#/");
      } else if (action === "toggle-open") {
        openSteps[key] = !openSteps[key];
        draw(root, catMeta, lesson, learned);
      } else if (action === "toggle-learned") {
        e.stopPropagation();
        if (learned[key]) delete learned[key];
        else learned[key] = true;
        await App.storage.setJSON(LEARNED_KEY, learned);
        draw(root, catMeta, lesson, learned);
      } else if (action === "speak") {
        e.stopPropagation();
        const step = lesson.steps[idx];
        App.speech.speak(stepSpeechText(step), key);
        App.speech.onChange(() => draw(root, catMeta, lesson, learned));
      } else if (action === "start-quiz") {
        App.router.navigate("#/quiz/" + catMeta.id);
      }
    };
  }

  function unload(catMeta) {
    if (catMeta && catMeta.lessonFile) App.loader.clearLesson(catMeta.lessonFile);
    openSteps = {}; // fresh expand/collapse state per visit, like the original session behavior
    currentLessonId = null;
    currentLessonTitle = "מסך ראשי";
  }

  function currentContextTitle() {
    return currentLessonTitle || currentLessonId || "";
  }

  return { render, unload, currentContextTitle };
})();
