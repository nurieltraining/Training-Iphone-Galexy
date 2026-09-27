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
      const wasSpeakingSameKey = speakingKey === key;
      cancelCurrent();
      if (wasSpeakingSameKey) {
        scheduleStopRetries(); // extra safety net only when the person explicitly asked to stop
        return true; // this click was just meant to stop the current reading
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "he-IL";
      utter.voice = hebrewVoice;
      utter.rate = 0.85; // slower and clearer, per feedback
      utter.onend = () => App.utils.safeTry(() => { speakingKey = null; notify(null); });
      utter.onerror = () => App.utils.safeTry(() => { speakingKey = null; notify(null); });
      speakingKey = key;
      stopGeneration++; // invalidate any pending retry-cancels from a previous stop
      notify(key);
      window.speechSynthesis.speak(utter);
      return true;
    }, false);
  }

  function cancelCurrent() {
    App.utils.safeTry(() => { if (supported) window.speechSynthesis.cancel(); });
    speakingKey = null;
    notify(null);
  }

  // speechSynthesis.cancel() is unreliable on several Android/Chrome-based
  // TTS engines: it often only prevents queued utterances from starting, but
  // fails to actually stop audio that's already mid-sentence — the browser
  // keeps talking until that utterance finishes on its own. This is a known
  // cross-browser bug, not something specific to this app. Retrying cancel()
  // a couple more times shortly after reliably kills the stuck audio on
  // those devices, and is a harmless no-op everywhere else.
  //
  // The retries are guarded by a generation counter and a speakingKey check:
  // if the person taps a different step's speak button right after stopping,
  // a delayed retry firing late must not cancel that new, legitimate speech.
  let stopGeneration = 0;
  function scheduleStopRetries() {
    stopGeneration++;
    const myGen = stopGeneration;
    const retryIfStillStopped = () => {
      if (stopGeneration === myGen && !speakingKey) {
        App.utils.safeTry(() => window.speechSynthesis.cancel());
      }
    };
    setTimeout(retryIfStillStopped, 60);
    setTimeout(retryIfStillStopped, 300);
  }

  function stop() {
    cancelCurrent();
    scheduleStopRetries();
  }

  function getSpeakingKey() {
    return speakingKey;
  }

  function onChange(fn) {
    onStateChange.push(fn);
  }

  function offChange(fn) {
    const idx = onStateChange.indexOf(fn);
    if (idx !== -1) onStateChange.splice(idx, 1);
  }

  function notify(key) {
    onStateChange.forEach((fn) => App.utils.safeTry(() => fn(key)));
  }

  return { init, isSupported, hasHebrewVoice, speak, stop, getSpeakingKey, onChange, offChange };
})();
