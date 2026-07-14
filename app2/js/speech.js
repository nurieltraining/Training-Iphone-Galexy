/* speech.js — text-to-speech wrapper. Any failure here must never crash
   the rest of the application; every entry point is wrapped. */
window.App = window.App || {};

App.speech = (function () {
  let hebrewVoice = null;
  let supported = false;
  let speakingKey = null;
  const onStateChange = []; // listeners(key|null)

  function init() {
    App.utils.safeTry(() => {
      supported = "speechSynthesis" in window;
      if (!supported) return;
      pickVoice();
      window.speechSynthesis.onvoiceschanged = () => App.utils.safeTry(pickVoice);
    });
  }

  function pickVoice() {
    if (!supported) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;
    hebrewVoice =
      voices.find((v) => v.lang && v.lang.toLowerCase() === "he-il") ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("he")) ||
      // many Android/Chrome TTS engines still report Hebrew under the old
      // ISO code "iw" (Hebrew's code before it was renamed to "he") — without
      // this, real Hebrew voices are missed and the browser silently falls
      // back to a default English voice, which cannot read Hebrew at all.
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("iw")) ||
      voices.find((v) => /hebrew|עברית/i.test(v.name || "")) ||
      null;
  }

  function hasHebrewVoice() {
    return !!hebrewVoice;
  }

  function isSupported() {
    return supported;
  }

  function speak(text, key) {
    return App.utils.safeTry(() => {
      if (!supported || !hebrewVoice) return false; // never read aloud with a non-Hebrew voice — that produced garbled/English-sounding output
      window.speechSynthesis.cancel();
      if (speakingKey === key) {
        // toggle off if the same item is tapped again
        speakingKey = null;
        notify(null);
        return true;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "he-IL";
      utter.voice = hebrewVoice;
      utter.rate = 0.85; // slower and clearer, per feedback
      utter.onend = () => App.utils.safeTry(() => { speakingKey = null; notify(null); });
      utter.onerror = () => App.utils.safeTry(() => { speakingKey = null; notify(null); });
      speakingKey = key;
      notify(key);
      window.speechSynthesis.speak(utter);
      return true;
    }, false);
  }

  function stop() {
    App.utils.safeTry(() => {
      if (supported) window.speechSynthesis.cancel();
      speakingKey = null;
      notify(null);
    });
  }

  function getSpeakingKey() {
    return speakingKey;
  }

  function onChange(fn) {
    onStateChange.push(fn);
  }

  function notify(key) {
    onStateChange.forEach((fn) => App.utils.safeTry(() => fn(key)));
  }

  return { init, isSupported, hasHebrewVoice, speak, stop, getSpeakingKey, onChange };
})();
