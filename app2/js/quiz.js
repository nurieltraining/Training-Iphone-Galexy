/* quiz.js — renders and scores a single quiz. Loads only its own JSON file,
   independently of the lesson content. Framed positively — never pass/fail. */
window.App = window.App || {};

App.quiz = (function () {
  const SCORES_KEY = "app2-quiz-scores"; // { [lessonId]: bestScore }
  let state = { answers: {}, submitted: false };

  async function render(root, catMeta) {
    root.innerHTML = '<div class="loading-note">טוען חידון...</div>';
    const quiz = await App.loader.getQuiz(catMeta.quizFile);
    if (!quiz) {
      root.innerHTML =
        '<div class="load-error">לא הצלחנו לטעון את החידון כרגע.' +
        '<button class="btn" data-action="go-cat" data-cat="' + catMeta.id + '">חזרה לשיעור</button></div>';
      App.utils.qs('[data-action="go-cat"]', root)?.addEventListener("click", () => App.router.navigate("#/category/" + catMeta.id));
      return;
    }

    state = { answers: {}, submitted: false };
    draw(root, catMeta, quiz);
  }

  function draw(root, catMeta, quiz) {
    let score = 0;
    if (state.submitted) {
      quiz.questions.forEach((q, i) => { if (state.answers[i] === q.correct) score++; });
    }

    root.innerHTML =
      '<header class="top">' +
      '<div class="top-row"><button class="back-btn" data-action="go-cat" data-cat="' + catMeta.id + '">→ ' +
      App.utils.escapeHtml(catMeta.title) + "</button></div>" +
      '<div class="cat-title"><span class="cat-icon-big">📝</span>בואו נראה מה זכרתם</div>' +
      "</header>" +
      "<main>" +
      (state.submitted
        ? '<div class="quiz-score-box"><p class="quiz-score-num">' + score + " מתוך " + quiz.questions.length + "</p>" +
          '<p class="quiz-score-msg">' + scoreMessage(score, quiz.questions.length) + "</p></div>"
        : '<p class="quiz-intro">בלי ציון עובר/נכשל - רק בדיקה ידידותית של מה שנשאר בזיכרון. בהצלחה!</p>') +
      quiz.questions.map((q, qi) => questionHtml(q, qi, state)).join("") +
      (state.submitted
        ? '<button class="btn quiz-retry-btn" data-action="retry">🔄 לנסות שוב</button>'
        : '<button class="btn quiz-submit-btn" data-action="submit">בדיקת התשובות</button>') +
      "</main>";

    wireEvents(root, catMeta, quiz);
  }

  function scoreMessage(score, total) {
    if (score === total) return "מושלם! ידעתם לזהות את כל המצבים נכון 🎉";
    if (score >= Math.ceil(total * 0.6)) return "יפה מאוד! כדאי לחזור על הנקודות שסומנו למטה.";
    return "כל התחלה טובה - כדאי לעבור שוב על ההסברים למטה ולנסות שוב.";
  }

  function questionHtml(q, qi, st) {
    const selected = st.answers[qi];
    const isCorrect = st.submitted && selected === q.correct;
    const isWrong = st.submitted && selected !== undefined && selected !== q.correct;
    return (
      '<div class="quiz-q-card"><p class="quiz-q-title">' + (qi + 1) + ". " + App.utils.escapeHtml(q.question) + "</p>" +
      q.answers
        .map((opt, oi) => {
          const isSel = selected === oi;
          let cls = "quiz-option";
          if (st.submitted) {
            if (oi === q.correct) cls += " correct";
            else if (isSel) cls += " wrong";
          } else if (isSel) cls += " selected";
          return (
            '<div class="' + cls + '" data-action="answer" data-qidx="' + qi + '" data-oidx="' + oi + '">' +
            '<span class="quiz-radio">' + (isSel ? "●" : "○") + "</span> " + App.utils.escapeHtml(opt) +
            "</div>"
          );
        })
        .join("") +
      (st.submitted
        ? '<div class="quiz-why ' + (isCorrect ? "is-correct" : isWrong ? "is-wrong" : "") + '">' +
          App.utils.escapeHtml(q.explanation) + "</div>"
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
      } else if (action === "answer") {
        if (state.submitted) return;
        state.answers[+el.getAttribute("data-qidx")] = +el.getAttribute("data-oidx");
        draw(root, catMeta, quiz);
      } else if (action === "submit") {
        state.submitted = true;
        await saveScore(catMeta.id, quiz);
        const wrongTitles = quiz.questions
          .filter((q, i) => state.answers[i] !== undefined && state.answers[i] !== q.correct)
          .map((q) => q.question);
        const score = quiz.questions.filter((q, i) => state.answers[i] === q.correct).length;
        App.registration.pingQuizResult(catMeta.title + " (" + catMeta.course + ")", score, quiz.questions.length, wrongTitles);
        draw(root, catMeta, quiz);
        window.scrollTo(0, 0);
      } else if (action === "retry") {
        state = { answers: {}, submitted: false };
        draw(root, catMeta, quiz);
        window.scrollTo(0, 0);
      }
    };
  }

  async function saveScore(lessonId, quiz) {
    const score = quiz.questions.filter((q, i) => state.answers[i] === q.correct).length;
    const scores = await App.storage.getJSON(SCORES_KEY, {});
    const best = scores[lessonId] || 0;
    scores[lessonId] = Math.max(best, score);
    await App.storage.setJSON(SCORES_KEY, scores);
  }

  function unload(catMeta) {
    if (catMeta && catMeta.quizFile) App.loader.clearLesson(catMeta.quizFile);
  }

  return { render, unload };
})();
