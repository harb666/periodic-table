// Speaking out loud. Everything goes through Zap's voice (src/voice), which
// falls back to the browser's built-in speech when the custom voice cannot run.
import { settingsStore } from '../state/store';
import { zapVoice, type SpeakOptions } from '../voice/zapVoice';

/** True if this browser can speak at all (custom voice or the built-in fallback). */
export function canSpeak(): boolean {
  return zapVoice.supported || zapVoice.fallbackSupported;
}

/** Is Zap allowed to talk? Needs the voice setting on and sound not muted. */
export function voiceEnabled(): boolean {
  const s = settingsStore.get();
  return s.sound && s.voice;
}

/** Speak because the user asked to hear something (a button press). Ignores the voice setting, not the mute. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!canSpeak()) return;
  void zapVoice.speak(text, opts);
}

/** Speak as part of Zap's own behaviour: only when his voice is switched on. */
export function zapSay(text: string, opts: SpeakOptions = {}): void {
  if (!voiceEnabled() || !canSpeak()) return;
  void zapVoice.speak(text, opts);
}

export function stopSpeaking(): void {
  zapVoice.stop();
}

/**
 * Browsers only allow audio after a tap or key press; arm the voice on the first one.
 * (iOS only counts the end of a touch or a click, so listen for those too.)
 * Also starts downloading the speech engine shortly after the page loads, so the
 * first sentence does not have to wait for it.
 */
export function installVoiceUnlock(): () => void {
  const unlock = () => {
    if (voiceEnabled()) zapVoice.unlock();
  };
  const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  const warm = setTimeout(() => {
    if (voiceEnabled()) zapVoice.warm();
  }, 2500);
  return () => {
    clearTimeout(warm);
    events.forEach((e) => window.removeEventListener(e, unlock));
  };
}
