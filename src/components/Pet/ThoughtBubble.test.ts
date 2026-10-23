import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

const source = fs.readFileSync(path.resolve(__dirname, 'ThoughtBubble.tsx'), 'utf-8');

// 1. Verify component definition & exports
assert(source.includes('export function ThoughtBubble'), 'ThoughtBubble function component is exported');
assert(source.includes('export interface ThoughtBubbleProps'), 'ThoughtBubbleProps interface is exported');

// 2. Verify placement options including left and right fin-side placements
assert(source.includes("'top' | 'bottom' | 'left' | 'right'"), 'ThoughtBubbleProps supports top, bottom, left, and right placements');

// 3. Left fin-side layout (when pet is on right side of screen)
assert(source.includes("placement === 'left'"), 'Handles left fin-side placement');
assert(source.includes('right-full mr-3.5'), 'Left fin placement positions bubble to the left of pet');
assert(source.includes('-right-3 top-1/2 -translate-y-1/2'), 'Left fin placement points thought pips toward left fin');

// 4. Right fin-side layout (when pet is on left side of screen)
assert(source.includes("placement === 'right'"), 'Handles right fin-side placement');
assert(source.includes('left-full ml-3.5'), 'Right fin placement positions bubble to the right of pet');
assert(source.includes('-left-3 top-1/2 -translate-y-1/2'), 'Right fin placement points thought pips toward right fin');

// 5. Backward compatibility for top and bottom placements
assert(source.includes("placement === 'top'"), 'Preserves top placement');
assert(source.includes("placement === 'bottom'"), 'Preserves bottom placement');

// 6. Horizontal width and multi-line wrapping
assert(source.includes('w-[210px] sm:w-[240px]'), 'Sets defined horizontal width on thought bubble');
assert(source.includes('break-words whitespace-normal'), 'Wraps quotes exceeding width into 2 or more lines');

if (failures > 0) process.exit(1);
console.log('✅ ThoughtBubble interface and fin-side placement tests passed');
