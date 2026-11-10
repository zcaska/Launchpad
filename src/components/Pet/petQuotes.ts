export type QuoteCategory =
  | 'taskComplete'
  | 'overwhelmed'
  | 'inactivitySlump'
  | 'coffeeBreak'
  | 'welcomeBack'
  | 'companionship';
// Companion prompts describe shared progress without judging inactivity.

export const QUOTE_LIBRARY: Record<QuoteCategory, string[]> = {
  companionship: [
    'One small step at a time. I am here with you.',
    'Ready for our next little adventure?',
    'A little focus, a little rest. We have got this.',
    'Thanks for the head pat. Keeping you company is my favorite job.',
    'Your progress is our story. Let us keep adding to it.',
  ],
  taskComplete: [
    'Massive W! Task crushed into dust. ✨',
    "Boom! You actually understood the assignment.",
    'Another win secured — your aura just leveled up.',
    'Look at that momentum building! You’re cooking now.',
    'Main character energy right here. Keep going.',
    'Small daily Ws compound into legendary streaks.',
  ],
  overwhelmed: [
    "Deep breath. We’re not getting cooked today.",
    'Big tasks are just mini side quests in disguise.',
    "Let’s pick one tiny step and lock in together.",
    'Protect your peace — you’ve totally got this.',
    'Pause, breathe, and tackle the main quest first.',
  ],
  inactivitySlump: [
    'Still right here with you! Ready whenever you want to cook.',
    'Rest is valid too. Take a breather.',
    "Starting is the hardest part — let's beat the inertia.",
    "Whenever you're ready, let’s knock out one quick win.",
    'Step away, stretch, and let’s lock back in.',
  ],
  coffeeBreak: [
    'Coffee break hits different ☕',
    'Warm sips, clear thoughts. Vibe check passed.',
    'Fueling up before we get back to cooking.',
    'Resting the gears for a moment.',
    'Ah, the simple joy of a warm mug.',
  ],
  welcomeBack: [
    'Welcome back! Time to secure the daily W.',
    'You’re back! Ready to jump in and cook?',
    'Good to see you again! Let’s lock in.',
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
