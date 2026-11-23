export function canSpeak(): boolean {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  } catch {
    return false;
  }
}

/** Speak text with the browser's speech synthesis (must be called from a user gesture on iOS). */
export function speak(text: string): boolean {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.1;
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}
