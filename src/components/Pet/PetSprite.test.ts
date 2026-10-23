import { resolveMascotVisual, PetSprite } from './PetSprite';
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

// 1. Component export definition
assert(typeof PetSprite === 'object' || typeof PetSprite === 'function', 'PetSprite component is exported');
assert(typeof resolveMascotVisual === 'function', 'resolveMascotVisual is exported as a function');

// 2. Coffee-break and isSippingCoffee visual configuration
const coffeeBreakVisual = resolveMascotVisual('coffee-break', false, false);
assert(coffeeBreakVisual.expression === 'calm', 'coffee-break has calm expression');
assert(coffeeBreakVisual.leftFinAngle === 12, 'coffee-break has leftFinAngle: 12 (relaxed forward fins)');
assert(coffeeBreakVisual.rightFinAngle === 12, 'coffee-break has rightFinAngle: 12 (relaxed forward fins)');

const sippingCoffeeVisual = resolveMascotVisual('idle', false, false, 'calm', true);
assert(sippingCoffeeVisual.expression === 'calm', 'isSippingCoffee overrides to calm expression');
assert(sippingCoffeeVisual.leftFinAngle === 12, 'isSippingCoffee has leftFinAngle: 12');
assert(sippingCoffeeVisual.rightFinAngle === 12, 'isSippingCoffee has rightFinAngle: 12');

// 3. Focused visual configuration
const focusedVisual = resolveMascotVisual('focused', false, false);
assert(focusedVisual.expression === 'focused', 'focused has focused expression');
assert(focusedVisual.pose === 'focus', 'focused has focus pose');
assert(focusedVisual.leftFinAngle === -6, 'focused has leftFinAngle: -6 (typing towards keyboard)');
assert(focusedVisual.rightFinAngle === -6, 'focused has rightFinAngle: -6 (typing towards keyboard)');

// 4. Source code static checks for SVG overlay and animated props
const petSpriteSource = fs.readFileSync(path.resolve(__dirname, 'PetSprite.tsx'), 'utf-8');

// Coffee mug specifications
assert(petSpriteSource.includes("viewBox=\"0 0 120 100\""), 'Overlay SVG matches 0 0 120 100 viewBox');
assert(petSpriteSource.includes('#8D5B4C'), 'Mug body contains #8D5B4C tone');
assert(petSpriteSource.includes('#A36B5B'), 'Mug contains #A36B5B highlight tone');
assert(petSpriteSource.includes('strokeWidth={2.2}'), 'Mug handle has strokeWidth=2.2');
assert(petSpriteSource.includes('@keyframes pet-steam'), 'Includes @keyframes pet-steam definition');
assert(petSpriteSource.includes('@keyframes pet-sip'), 'Includes @keyframes pet-sip definition');
assert(petSpriteSource.includes('transform: translateY(-10px) scale(1.3)'), 'Steam rises and expands');
assert(petSpriteSource.includes('rotate(-7deg) translateY(-2px)'), 'Sipping tilts gently');

// Laptop specifications (Faithful to Reference Sheet §4)
assert(petSpriteSource.includes('data-prop="laptop"'), 'Working laptop prop layer is defined');
assert(petSpriteSource.includes('fill="#334155"'), 'Laptop base contains #334155 finish');
assert(petSpriteSource.includes('url(#pet-lid-gradient)'), 'Laptop screen lid renders with metallic gradient');
assert(petSpriteSource.includes('url(#pet-laptop-glow)'), 'Laptop displays screen glow radiating toward mascot');
assert(petSpriteSource.includes('stroke="#64748B"'), 'Keyboard/trackpad details match spec');
assert(petSpriteSource.includes('@keyframes pet-screen-glow'), 'Screen glow animation is defined');

// Reduced motion and flip transform
assert(petSpriteSource.includes("transform: facing === -1 ? 'scaleX(-1)' : undefined"), 'Overlay SVG mirrors when facing === -1');
assert(petSpriteSource.includes('reducedMotion ? undefined :'), 'CSS animation classes disabled when reducedMotion is true');
assert(petSpriteSource.includes('prefers-reduced-motion: reduce'), 'Prefers-reduced-motion media query present');

// 5. Adaptive responsive mobile scaling
assert(petSpriteSource.includes('size?: number'), 'PetSpriteProps includes optional size property');
assert(petSpriteSource.includes('size = 84'), 'PetSpriteComponent defaults size to 84');
assert(petSpriteSource.includes('width={size}'), 'Overlay SVG dynamically scales with width={size}');
assert(petSpriteSource.includes('height={height}'), 'Overlay SVG dynamically scales with height={height}');

if (failures > 0) {
  process.exit(1);
}
console.log('\n✅ All PetSprite animated props tests passed!');
