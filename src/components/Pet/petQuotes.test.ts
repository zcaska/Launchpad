import { getPetQuote, resetQuoteHistory, QuoteCategory } from './petQuotes';

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

resetQuoteHistory();

// 1. Returns a valid non-empty string for each category
const categories: QuoteCategory[] = [
  'taskComplete',
  'overwhelmed',
  'inactivitySlump',
  'coffeeBreak',
  'focusStart',
  'welcomeBack',
];

for (const cat of categories) {
  const q = getPetQuote(cat);
  assert(typeof q === 'string' && q.length > 5, `Category ${cat} returned valid quote: "${q}"`);
}

// 2. Anti-repetition test: 4 consecutive draws in a category with >= 4 quotes never repeat immediately
resetQuoteHistory();
const seen = new Set<string>();
for (let i = 0; i < 4; i++) {
  const quote = getPetQuote('taskComplete');
  assert(!seen.has(quote), `Draw ${i + 1} was unique within window: "${quote}"`);
  seen.add(quote);
}

if (failures > 0) process.exit(1);
console.log('✅ All petQuotes tests passed');
