let context: AudioContext | undefined;

/** Call during the confirmation gesture so browsers can authorize audio. */
export function prepareTaskCompletionSound() {
  try {
    if (!context || context.state === 'closed') context = new window.AudioContext();
    if (context.state !== 'running') void context.resume().catch(() => {});
  } catch {
    // Audio is optional and must never block task completion.
  }
}

export async function playTaskCompletionBell() {
  try {
    if (!context || context.state === 'closed') return;
    const audio = context;
    if (audio.state !== 'running') await audio.resume();
    if (audio.state !== 'running') return;
    const now = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    gain.connect(audio.destination);
    let remaining = 2;
    for (const [frequency, volume, delay] of [[1046.5, 1, 0], [1318.5, 0.75, 0.065]] as const) {
      const oscillator = audio.createOscillator();
      const partialGain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      partialGain.gain.value = volume;
      oscillator.connect(partialGain);
      partialGain.connect(gain);
      oscillator.onended = () => {
        oscillator.disconnect();
        partialGain.disconnect();
        if (--remaining === 0) gain.disconnect();
      };
      oscillator.start(now + delay);
      oscillator.stop(now + 0.33);
    }
    // Reuse the authorized context; cleanup follows audio time, not a wall timer.
  } catch {
    // Denied/unsupported audio must never block task completion.
  }
}
