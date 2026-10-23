export type QuoteCategory =
  | 'taskComplete'
  | 'overwhelmed'
  | 'inactivitySlump'
  | 'coffeeBreak'
  | 'focusStart'
  | 'welcomeBack';

export const QUOTE_LIBRARY: Record<QuoteCategory, string[]> = {
  taskComplete: [
    'One step closer to greatness! ✨',
    "Boom! That's another win in the books.",
    'Every finished task is a promise kept to yourself.',
    'Look at that momentum building! Keep going.',
    'Great work! Take pride in that progress.',
    'Small wins stack into massive victories.',
  ],
  overwhelmed: [
    "Deep breath. You don't have to finish everything today.",
    'Big mountains are climbed one small pebble at a time.',
    "Let's focus on just one tiny step together.",
    'Prioritize peace. You have got this.',
    'Pause, breathe, and pick the one that matters most.',
  ],
  inactivitySlump: [
    'Still with you! Ready whenever you want to begin.',
    'Rest is part of the work too. Take your time.',
    "Starting is the hardest part — I'm right here with you.",
    "Whenever you're ready, let's knock out one task.",
    'A gentle breath of fresh air does wonders.',
  ],
  coffeeBreak: [
    'Mmm... fresh brew. Taking a cozy sip ☕',
    'Warm sips, clear thoughts.',
    'A little coffee break makes everything better.',
    'Resting the gears for a moment.',
    'Ah, the simple joy of a warm mug.',
  ],
  focusStart: [
    "Zone activated. Let's do this!",
    'Headphones on, distractions off.',
    'Deep focus time. I will keep you company quietly.',
    'Entering the flow state.',
  ],
  welcomeBack: [
    'Welcome back! Let us make today count.',
    'Hey there! Ready to jump back in?',
    'Good to see you again!',
  ],
};

const HISTORY_SIZE = 4;
const recentHistory: string[] = [];

export function resetQuoteHistory(): void {
  recentHistory.length = 0;
}

export function getPetQuote(category: QuoteCategory): string {
  const pool = QUOTE_LIBRARY[category];
  if (!pool || pool.length === 0) return 'Keep going!';

  const eligible = pool.filter((q) => !recentHistory.includes(q));
  const candidatePool = eligible.length > 0 ? eligible : pool;

  const picked = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  recentHistory.push(picked);
  if (recentHistory.length > HISTORY_SIZE) {
    recentHistory.shift();
  }
  return picked;
}
