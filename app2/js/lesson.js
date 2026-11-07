/* lesson.js — renders a single lesson (category) page: expandable step cards,
   mini-step splitting on ">", a learn/speak button row, per-category
   diagrams, and a "next lesson" link. Loads only its own JSON file on demand
   via loader.js.

   Accessibility: step headers are real <button>s with aria-expanded, and
   after every redraw keyboard/screen-reader focus is put back on the control
   the person just used (a full innerHTML redraw otherwise throws focus back
   to the top of the page). */
window.App = window.App || {};

App.lesson = (function () {
  const LEARNED_KEY = "app2-learned"; // { [catId-stepIdx]: true }
  const esc = (s) => App.utils.escapeHtml(s);
  let currentLessonId = null;
  let currentLessonTitle = "מסך ראשי";
  let openSteps = {}; // local UI state, not persisted — session-only "open" behavior

  async function render(root, catMeta, focusStep) {
    currentLessonId = catMeta.id;
    currentLessonTitle = catMeta.title;
    root.innerHTML = '<div class="loading-note">טוען...</div>';

    const lesson = await App.loader.getLesson(catMeta.lessonFile);
    if (!lesson) {
      root.innerHTML =
        '<div class="load-error">לא הצלחנו לטעון את השיעור הזה כרגע. בדקו את החיבור לאינטרנט ונסו שוב.' +
        '<button type="button" class="btn" data-action="retry-lesson">נסה שוב</button></div>';
      App.utils.qs('[data-action="retry-lesson"]', root)?.addEventListener("click", () => render(root, catMeta));
      return;
    }

    App.ui.rememberLastCategory(catMeta);
    const learned = await App.storage.getJSON(LEARNED_KEY, {});
    const hasFocusStep = Number.isInteger(focusStep) && focusStep >= 0 && focusStep < lesson.steps.length;
    if (hasFocusStep) openSteps[catMeta.id + "-" + focusStep] = true;
    window.scrollTo(0, 0);
    draw(root, catMeta, lesson, learned, hasFocusStep ? '[data-action="toggle-open"][data-idx="' + focusStep + '"]' : null);
    if (hasFocusStep) {
      const head = App.utils.qs('[data-action="toggle-open"][data-idx="' + focusStep + '"]', root);
      if (head) head.scrollIntoView({ block: "start" });
    }
  }

  function learnedCountFor(catId, stepCount, learned) {
    let n = 0;
    for (let i = 0; i < stepCount; i++) if (learned[catId + "-" + i]) n++;
    return n;
  }

  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? m[3] + "." + m[2] + "." + m[1] : "";
  }

  function draw(root, catMeta, lesson, learned, focusSelector) {
    const lc = learnedCountFor(catMeta.id, lesson.steps.length, learned);
    const total = lesson.steps.length;
    const pc = total ? Math.round((lc / total) * 100) : 0;
    const next = App.ui.nextCategory(catMeta);
    const allDone = total && lc === total;

    root.innerHTML =
      '<header class="top">' +
      '<div class="top-row"><button type="button" class="back-btn" data-action="go-home">→ כל הנושאים</button>' +
      App.textSize.buttonHtml() + "</div>" +
      '<h1 class="cat-title"><span class="cat-icon-big">' + iconHtml(catMeta) + "</span>" +
      "<span>" + esc(lesson.title) + "</span></h1>" +
      '<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pc + '" aria-label="התקדמות בשיעור">' +
      '<div class="progress-fill" style="width:' + pc + '%"></div></div>' +
      '<p class="cat-progress-line">' + lc + " מתוך " + total + " שלבים נלמדו</p>" +
      "</header>" +
      "<main>" +
      '<p class="lesson-hint">לחצו על כל שלב כדי לפתוח אותו. אפשר לבצע את הפעולות בטלפון תוך כדי קריאה.</p>' +
      '<button type="button" class="link-btn present-link" data-action="present">📽️ מצב הצגה למדריך (שלב אחד על כל המסך)</button>' +
      App.diagrams.forCategory(catMeta.id) +
      lesson.steps.map((s, i) => stepHtml(catMeta.id, s, i, learned)).join("") +
      (allDone ? '<p class="lesson-done">🎉 כל הכבוד! סיימתם את כל השלבים בשיעור הזה.</p>' : "") +
      (catMeta.quizFile
        ? '<button type="button" class="btn quiz-start-btn" data-action="start-quiz">📝 בואו נראה מה זכרתם</button>'
        : "") +
      (next
        ? '<button type="button" class="btn next-lesson-btn" data-action="next-lesson" data-cat="' + esc(next.id) + '">לשיעור הבא: ' + esc(next.title) + " ←</button>"
        : '<button type="button" class="btn next-lesson-btn" data-action="go-home">חזרה לכל הנושאים</button>') +
      (lesson.reviewed
        ? '<p class="reviewed-note">התוכן נבדק לאחרונה: ' + formatDate(lesson.reviewed) +
          ". מסכי האפליקציות משתנים מדי פעם - אם משהו נראה אחרת אצלכם, ספרו לנו בכפתור המשוב.</p>"
        : '<p class="reviewed-note">מסכי האפליקציות משתנים מדי פעם - אם משהו נראה אחרת אצלכם, ספרו לנו בכפתור המשוב.</p>') +
      "</main>";

    wireEvents(root, catMeta, lesson, learned);

    if (focusSelector) {
      const el = App.utils.qs(focusSelector, root);
      if (el) el.focus({ preventScroll: true });
    }
  }

  function iconHtml(catMeta) {
    if (!catMeta.image) return esc(catMeta.icon || "");
    return '<img src="' + esc(catMeta.image) + '" alt="" class="cat-icon-img">';
  }

  function splitMiniSteps(body) {
    if (body.indexOf(">") === -1) return null;
    return body.split(">").map((s) => s.trim()).filter(Boolean);
  }

  function stepBodyHtml(body) {
    const parts = splitMiniSteps(body);
    if (!parts) return '<p class="step-text">' + esc(body) + "</p>";
    return (
      '<ol class="mini-steps">' +
      parts.map((p, i) => '<li><span class="mini-num" aria-hidden="true">' + (i + 1) + "</span><span>" + esc(p) + "</span></li>").join("") +
      "</ol>"
    );
  }

  function stepSpeechText(step) {
    const parts = splitMiniSteps(step.text);
    let out = step.title + ". ";
    if (!parts) out += step.text;
    else parts.forEach((p, i) => (out += "שלב " + (i + 1) + ": " + p + ". "));
    if (step.warning) out += " שימו לב: " + step.warning;
    return out;
  }

  function warnBoxHtml(text) {
    return '<div class="warn-box" role="note"><span class="warn-ic" aria-hidden="true">⚠️</span><span>' + esc(text) + "</span></div>";
  }

  function stepHtml(catId, step, i, learned) {
    const key = catId + "-" + i;
    const isOpen = !!openSteps[key];
    const isLearned = !!learned[key];
    const isSpeaking = App.speech.getSpeakingKey() === key;
    const canSpeak = App.speech.isSupported() && App.speech.hasHebrewVoice();
    const bodyId = "step-body-" + i;
    return (
      '<div class="step-card ' + (isOpen ? "open" : "") + " " + (isLearned ? "learned" : "") + '">' +
      '<button type="button" class="step-head" data-action="toggle-open" data-idx="' + i + '" aria-expanded="' + isOpen + '" aria-controls="' + bodyId + '">' +
      '<span class="step-num" aria-hidden="true">' + (isLearned ? "✓" : i + 1) + "</span>" +
      '<span class="step-title">' + (isLearned ? '<span class="sr-only">נלמד: </span>' : "") + esc(step.title) + "</span>" +
      '<span class="chev" aria-hidden="true">▾</span>' +
      "</button>" +
      '<div class="step-body" id="' + bodyId + '"' + (isOpen ? "" : " hidden") + '><div class="step-body-inner">' +
      stepBodyHtml(step.text) +
      (step.warning ? warnBoxHtml(step.warning) : "") +
      '<div class="btn-row">' +
      (canSpeak
        ? '<button type="button" class="btn btn-read ' + (isSpeaking ? "speaking" : "") + '" data-action="speak" data-idx="' + i + '">' +
          (isSpeaking ? "⏹ עצירת ההקראה" : "🔊 הקריאו לי את זה") +
          "</button>"
        : '<button type="button" class="btn btn-read" disabled title="במכשיר הזה אין קול הקראה בעברית מותקן">🔇 הקראה לא זמינה במכשיר זה</button>') +
      '<button type="button" class="btn btn-learn ' + (isLearned ? "on" : "") + '" data-action="toggle-learned" data-idx="' + i + '" aria-pressed="' + isLearned + '">' +
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
      const sameControl = '[data-action="' + action + '"]' + (idx !== null ? '[data-idx="' + idx + '"]' : "");

      if (action === "go-home") {
        App.router.navigate("#/");
      } else if (action === "toggle-open") {
        openSteps[key] = !openSteps[key];
        draw(root, catMeta, lesson, learned, sameControl);
      } else if (action === "toggle-learned") {
        e.stopPropagation();
        const willBeLearned = !learned[key];
        if (willBeLearned) learned[key] = true;
        else delete learned[key];
        await App.storage.setJSON(LEARNED_KEY, learned);
        if (App.sync) App.sync.schedulePush(); // back up to the Sheet (registered users only)
        App.registration.pingStepEngagement(catMeta.title + " (" + catMeta.course + ")", idx, lesson.steps[idx] ? lesson.steps[idx].title : "", willBeLearned);
        draw(root, catMeta, lesson, learned, sameControl);
      } else if (action === "speak") {
        e.stopPropagation();
        const step = lesson.steps[idx];
        App.speech.speak(stepSpeechText(step), key);
      } else if (action === "start-quiz") {
        App.router.navigate("#/quiz/" + catMeta.id);
      } else if (action === "present") {
        App.router.navigate("#/present/" + catMeta.id + "/0");
      } else if (action === "next-lesson") {
        App.router.navigate("#/category/" + el.getAttribute("data-cat"));
      }
    };

    // Registered once per lesson visit (not once per click).
    if (speechListener) App.speech.offChange(speechListener);
    speechListener = () => {
      const active = document.activeElement;
      const sel = active && active.getAttribute && active.getAttribute("data-action") === "speak"
        ? '[data-action="speak"][data-idx="' + active.getAttribute("data-idx") + '"]'
        : null;
      draw(root, catMeta, lesson, learned, sel);
    };
    App.speech.onChange(speechListener);
  }

  let speechListener = null;

  function unload(catMeta) {
    if (catMeta && catMeta.lessonFile) App.loader.clearLesson(catMeta.lessonFile);
    if (speechListener) { App.speech.offChange(speechListener); speechListener = null; }
    App.speech.stop(); // don't let a step's reading keep playing after leaving the lesson
    openSteps = {};
    currentLessonId = null;
    currentLessonTitle = "מסך ראשי";
  }

  function currentContextTitle() {
    return currentLessonTitle || currentLessonId || "";
  }

  return { render, unload, currentContextTitle };
})();
