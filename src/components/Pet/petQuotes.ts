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
    "I'll keep this corner warm.",
    'I brought a tiny pencil. It is mostly for show.',
    'We can take the scenic route, one step at a time.',
    'If you need me, I am very good at sitting nearby.',
    'Quiet company is my specialty. That and crumbs.',
  ],
  taskComplete: [
    'One more done. That deserves a tiny drumroll.',
    'I would clap, but these fins make a very small noise.',
    'Look at you making things happen. I saw that.',
    'A good win. I am filing it under Things Worth Remembering.',
    'You did the work. I did a little victory wiggle.',
    'That checkmark looks good on you.',
  ],
  overwhelmed: [
    'Pick the smallest piece. I can keep the rest company.',
    'A sip first. Then we can choose one thing.',
    'Everything looks big from down here. One step is plenty.',
    'We can give one thing our attention for a while.',
    "I'll sit with you while you find a place to start.",
  ],
  inactivitySlump: [
    'Take your time. I found a warm spot.',
    'A good pause has its own little rhythm.',
    "I'll be in my corner if you want company.",
    'The desk is quiet. I rather like it here.',
    'Shoulder roll? I would join in, but I am mostly shoulder.',
  ],
  coffeeBreak: [
    'I am warming both fins on this mug.',
    'Careful. The cocoa is nearly as tall as I am.',
    'I saved you a seat by the warm mug.',
    'A small sip and a long stretch. Excellent plan.',
    'I volunteer to guard the biscuits.',
  ],
  welcomeBack: [
    'Welcome back. Your corner is still warm.',
    'Good to see you. I have been minding the pencils.',
    'There you are. I saved us a quiet minute.',
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
