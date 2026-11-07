/* quiz.js — renders and scores a single quiz. Loads only its own JSON file,
   independently of the lesson content. Framed positively — never pass/fail.

   Answer options are shuffled on every visit and every retry (see
   shuffleAnswers) because the JSON files list the correct answer almost
   always first or second. Options are real radio-style buttons so they work
   with VoiceOver/TalkBack and the keyboard. */
window.App = window.App || {};

App.quiz = (function () {
  const SCORES_KEY = "app2-quiz-scores"; // { [lessonId]: bestScore }
  const esc = (s) => App.utils.escapeHtml(s);
  let state = { answers: {}, submitted: false };
  let sourceQuiz = null;

  async function render(root, catMeta) {
    root.innerHTML = '<div class="loading-note">טוען חידון...</div>';
    const quiz = await App.loader.getQuiz(catMeta.quizFile);
    if (!quiz) {
      root.innerHTML =
        '<div class="load-error">לא הצלחנו לטעון את החידון כרגע.' +
        '<button type="button" class="btn" data-action="go-cat">חזרה לשיעור</button></div>';
      App.utils.qs('[data-action="go-cat"]', root)?.addEventListener("click", () => App.router.navigate("#/category/" + catMeta.id));
      return;
    }

    state = { answers: {}, submitted: false };
    sourceQuiz = quiz;
    window.scrollTo(0, 0);
    draw(root, catMeta, shuffleAnswers(quiz));
  }

  // Shuffle each question's options and remap `correct` to its new
  // position. Works on a copy — the cached JSON from loader.js is never
  // mutated.
  function shuffleAnswers(quiz) {
    return Object.assign({}, quiz, {
      questions: quiz.questions.map((q) => {
        const order = q.answers.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        return Object.assign({}, q, {
          answers: order.map((i) => q.answers[i]),
          correct: order.indexOf(q.correct),
        });
      }),
    });
  }

  function scoreOf(quiz) {
    return quiz.questions.filter((q, i) => state.answers[i] === q.correct).length;
  }

  function draw(root, catMeta, quiz, focusSelector) {
    const total = quiz.questions.length;
    const answered = Object.keys(state.answers).length;
    const score = state.submitted ? scoreOf(quiz) : 0;
    const next = App.ui.nextCategory(catMeta);

    root.innerHTML =
      '<header class="top">' +
      '<div class="top-row"><button type="button" class="back-btn" data-action="go-cat">→ ' +
      esc(catMeta.title) + "</button>" + App.textSize.buttonHtml() + "</div>" +
      '<h1 class="cat-title"><span class="cat-icon-big" aria-hidden="true">📝</span><span>בואו נראה מה זכרתם</span></h1>' +
      "</header>" +
      "<main>" +
      (state.submitted
        ? '<div class="quiz-score-box" role="status" tabindex="-1"><p class="quiz-score-num">' + score + " מתוך " + total + "</p>" +
          '<p class="quiz-score-msg">' + scoreMessage(score, total) + "</p></div>"
        : '<p class="quiz-intro">בלי ציון עובר/נכשל - רק בדיקה ידידותית של מה שנשאר בזיכרון. בהצלחה!</p>') +
      quiz.questions.map((q, qi) => questionHtml(q, qi)).join("") +
      (state.submitted
        ? '<button type="button" class="btn quiz-retry-btn" data-action="retry">🔄 לנסות שוב</button>' +
          '<button type="button" class="btn next-lesson-btn secondary" data-action="go-cat">חזרה לשיעור</button>' +
          (next
            ? '<button type="button" class="btn next-lesson-btn" data-action="next-lesson" data-cat="' + esc(next.id) + '">לשיעור הבא: ' + esc(next.title) + " ←</button>"
            : '<button type="button" class="btn next-lesson-btn" data-action="go-home">חזרה לכל הנושאים</button>')
        : (answered < total
            ? '<p class="quiz-progress">עניתם על ' + answered + " מתוך " + total + " שאלות</p>"
            : '<p class="quiz-progress">עניתם על כל השאלות 👍</p>') +
          '<button type="button" class="btn quiz-submit-btn" data-action="submit"' + (answered ? "" : " disabled") + ">בדיקת התשובות</button>") +
      "</main>";

    wireEvents(root, catMeta, quiz);

    if (focusSelector) {
      const el = App.utils.qs(focusSelector, root);
      if (el) el.focus({ preventScroll: true });
    }
  }

  function scoreMessage(score, total) {
    if (score === total) return "מושלם! ידעתם לזהות את כל המצבים נכון 🎉";
    if (score >= Math.ceil(total * 0.6)) return "יפה מאוד! כדאי לחזור על הנקודות שסומנו למטה.";
    return "כל התחלה טובה - כדאי לעבור שוב על ההסברים למטה ולנסות שוב.";
  }

  function questionHtml(q, qi) {
    const selected = state.answers[qi];
    const st = state.submitted;
    const isCorrect = st && selected === q.correct;
    const isWrong = st && selected !== undefined && selected !== q.correct;
    const titleId = "q-title-" + qi;
    return (
      '<div class="quiz-q-card"><p class="quiz-q-title" id="' + titleId + '">' + (qi + 1) + ". " + esc(q.question) + "</p>" +
      '<div role="radiogroup" aria-labelledby="' + titleId + '">' +
      q.answers
        .map((opt, oi) => {
          const isSel = selected === oi;
          let cls = "quiz-option";
          let srNote = "";
          if (st) {
            if (oi === q.correct) { cls += " correct"; srNote = '<span class="sr-only"> (התשובה הנכונה)</span>'; }
            else if (isSel) { cls += " wrong"; srNote = '<span class="sr-only"> (התשובה שבחרתם - לא נכונה)</span>'; }
          } else if (isSel) cls += " selected";
          return (
            '<button type="button" role="radio" aria-checked="' + isSel + '" class="' + cls + '" data-action="answer" data-qidx="' + qi + '" data-oidx="' + oi + '"' +
            (st ? ' aria-disabled="true"' : "") + ">" +
            '<span class="quiz-radio" aria-hidden="true">' + (st && oi === q.correct ? "✓" : st && isSel ? "✗" : isSel ? "●" : "○") + "</span>" +
            "<span>" + esc(opt) + srNote + "</span>" +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      (st
        ? '<div class="quiz-why ' + (isCorrect ? "is-correct" : isWrong ? "is-wrong" : "") + '">' +
          (isCorrect ? "✓ נכון! " : isWrong ? "לא בדיוק. " : "לא נבחרה תשובה. ") +
          esc(q.explanation) + "</div>"
        : "") +
      "</div>"
    );
  }

  function wireEvents(root, catMeta, quiz) {
    root.onclick = async (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const action = el.getAttribute("data-action");

      if (action === "go-cat") {
        App.router.navigate("#/category/" + catMeta.id);
      } else if (action === "go-home") {
        App.router.navigate("#/");
      } else if (action === "next-lesson") {
        App.router.navigate("#/category/" + el.getAttribute("data-cat"));
      } else if (action === "answer") {
        if (state.submitted) return;
        const qi = +el.getAttribute("data-qidx");
        const oi = +el.getAttribute("data-oidx");
        state.answers[qi] = oi;
        draw(root, catMeta, quiz, '[data-qidx="' + qi + '"][data-oidx="' + oi + '"]');
      } else if (action === "submit") {
        state.submitted = true;
        await saveScore(catMeta.id, quiz);
        const wrongTitles = quiz.questions
          .map((q, i) => i)
          .filter((i) => state.answers[i] !== undefined && state.answers[i] !== quiz.questions[i].correct)
          .map((i) => i + 1);
        App.registration.pingQuizResult(catMeta.title + " (" + catMeta.course + ")", scoreOf(quiz), quiz.questions.length, wrongTitles);
        window.scrollTo(0, 0);
        draw(root, catMeta, quiz, ".quiz-score-box");
      } else if (action === "retry") {
        state = { answers: {}, submitted: false };
        window.scrollTo(0, 0);
        draw(root, catMeta, shuffleAnswers(sourceQuiz || quiz));
      }
    };
  }

  async function saveScore(lessonId, quiz) {
    const score = scoreOf(quiz);
    const scores = await App.storage.getJSON(SCORES_KEY, {});
    const best = scores[lessonId] || 0;
    scores[lessonId] = Math.max(best, score);
    await App.storage.setJSON(SCORES_KEY, scores);
    if (App.sync) App.sync.schedulePush();
  }

  function unload(catMeta) {
    if (catMeta && catMeta.quizFile) App.loader.clearLesson(catMeta.quizFile);
  }

  return { render, unload };
})();
