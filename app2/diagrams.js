/* diagrams.js — small inline SVG device diagrams for the "meet your phone"
   lessons. Kept as a separate module (not baked into lesson.js) since it's
   presentational reference content specific to a couple of categories. */
window.App = window.App || {};

App.diagrams = (function () {
  function iphoneSVG() {
    return (
      '<svg viewBox="0 0 400 300" width="100%" height="auto" role="img" aria-label="תרשים אייפון עם חלקיו העיקריים">' +
      '<rect x="40" y="18" width="120" height="256" rx="26" fill="#fff" stroke="#26333a" stroke-width="3"/>' +
      '<rect x="82" y="27" width="36" height="10" rx="5" fill="#26333a"/>' +
      '<rect x="88" y="235" width="24" height="4" rx="2" fill="#c7c2b3"/>' +
      '<text x="100" y="260" font-size="10" text-anchor="middle" fill="#5b6b70">קדימה</text>' +
      '<circle cx="100" cy="150" r="12" fill="#356f80"/><text x="100" y="154" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">1</text>' +
      '<rect x="158" y="55" width="4" height="26" fill="#26333a"/>' +
      '<circle cx="182" cy="68" r="12" fill="#356f80"/><text x="182" y="72" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">2</text>' +
      '<rect x="38" y="70" width="4" height="16" fill="#26333a"/>' +
      '<rect x="38" y="94" width="4" height="16" fill="#26333a"/>' +
      '<circle cx="18" cy="88" r="12" fill="#356f80"/><text x="18" y="92" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">3</text>' +
      '<rect x="38" y="48" width="4" height="14" fill="#26333a"/>' +
      '<circle cx="18" cy="48" r="12" fill="#356f80"/><text x="18" y="52" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">4</text>' +
      '<circle cx="100" cy="292" r="12" fill="#356f80"/><text x="100" y="296" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">5</text>' +
      '<rect x="240" y="18" width="120" height="256" rx="26" fill="#fff" stroke="#26333a" stroke-width="3"/>' +
      '<circle cx="270" cy="52" r="12" fill="none" stroke="#26333a" stroke-width="2.5"/>' +
      '<circle cx="292" cy="52" r="12" fill="none" stroke="#26333a" stroke-width="2.5"/>' +
      '<circle cx="270" cy="76" r="12" fill="none" stroke="#26333a" stroke-width="2.5"/>' +
      '<circle cx="300" cy="150" r="20" fill="none" stroke="#c7c2b3" stroke-width="2"/>' +
      '<text x="300" y="260" font-size="10" text-anchor="middle" fill="#5b6b70">גב</text>' +
      '<circle cx="322" cy="45" r="12" fill="#356f80"/><text x="322" y="49" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">6</text>' +
      '<rect x="358" y="150" width="4" height="20" fill="#26333a"/>' +
      '<circle cx="382" cy="160" r="12" fill="#356f80"/><text x="382" y="164" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">7</text>' +
      "</svg>"
    );
  }

  function iphoneLegend() {
    const items = [
      "1. המסך הקדמי", "2. כפתור הצד", "3. כפתורי הווליום",
      "4. מתג שקט / כפתור פעולה", "5. שקע הטעינה", "6. עדשות המצלמה בגב", "7. כפתור המצלמה (בדגמים חדשים)",
    ];
    return '<p class="diagram-caption">' + items.map(App.utils.escapeHtml).join(" &nbsp;•&nbsp; ") + "</p>";
  }

  function galaxySVG() {
    return (
      '<svg viewBox="0 0 400 300" width="100%" height="auto" role="img" aria-label="תרשים גלקסי עם חלקיו העיקריים">' +
      '<rect x="40" y="18" width="120" height="256" rx="20" fill="#fff" stroke="#26333a" stroke-width="3"/>' +
      '<circle cx="100" cy="32" r="5" fill="#26333a"/>' +
      '<circle cx="100" cy="185" r="13" fill="none" stroke="#c7c2b3" stroke-width="2" stroke-dasharray="3 3"/>' +
      '<circle cx="100" cy="130" r="12" fill="#356f80"/><text x="100" y="134" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">1</text>' +
      '<rect x="158" y="55" width="4" height="26" fill="#26333a"/>' +
      '<circle cx="182" cy="68" r="12" fill="#356f80"/><text x="182" y="72" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">2</text>' +
      '<rect x="38" y="55" width="4" height="16" fill="#26333a"/>' +
      '<rect x="38" y="79" width="4" height="16" fill="#26333a"/>' +
      '<circle cx="18" cy="72" r="12" fill="#356f80"/><text x="18" y="76" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">3</text>' +
      '<rect x="60" y="272" width="18" height="4" rx="2" fill="#26333a"/>' +
      '<circle cx="55" cy="292" r="12" fill="#356f80"/><text x="55" y="296" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">4</text>' +
      '<rect x="94" y="272" width="12" height="4" rx="2" fill="#26333a"/>' +
      '<circle cx="130" cy="292" r="12" fill="#356f80"/><text x="130" y="296" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">5</text>' +
      '<rect x="240" y="18" width="120" height="256" rx="20" fill="#fff" stroke="#26333a" stroke-width="3"/>' +
      '<rect x="256" y="34" width="34" height="50" rx="10" fill="none" stroke="#26333a" stroke-width="2"/>' +
      '<circle cx="264" cy="46" r="7" fill="none" stroke="#26333a" stroke-width="2"/>' +
      '<circle cx="282" cy="46" r="7" fill="none" stroke="#26333a" stroke-width="2"/>' +
      '<circle cx="264" cy="66" r="7" fill="none" stroke="#26333a" stroke-width="2"/>' +
      '<circle cx="322" cy="45" r="12" fill="#356f80"/><text x="322" y="49" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">6</text>' +
      '<circle cx="100" cy="292" r="12" fill="#356f80"/><text x="100" y="296" font-size="12" text-anchor="middle" fill="#fff" font-weight="700">7</text>' +
      "</svg>"
    );
  }

  function galaxyLegend() {
    const items = [
      "1. המסך הקדמי (מצלמה + טביעת אצבע)", "2. כפתור הצד (Side Key)", "3. כפתורי הווליום",
      "4. חריץ ה-S Pen", "5. שקע טעינה USB-C", "6. עדשות המצלמה בגב", "7. פתיחה מהירה של המצלמה",
    ];
    return '<p class="diagram-caption">' + items.map(App.utils.escapeHtml).join(" &nbsp;•&nbsp; ") + "</p>";
  }

  function forCategory(catId) {
    if (catId === "meetiphone") return '<div class="diagram-wrap">' + iphoneSVG() + iphoneLegend() + "</div>";
    if (catId === "meetgalaxy") return '<div class="diagram-wrap">' + galaxySVG() + galaxyLegend() + "</div>";
    return "";
  }

  return { forCategory };
})();
