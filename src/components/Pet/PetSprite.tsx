import { memo } from 'react';
import type { PetState, PetTier } from '../../utils/petState';

// Launchpad Pet — clean vector SVG sprite.
// Expressive FACE is the main focus with clean proportions and responsive micro-animations.
// Smooth anti-aliased rendering. Palette from the character sheet:
//   body #FF8A5B, shadows #E0673F, highlights #FFD3C2, eyes/outline #111111.
//
// Pure presentation: receives state/motion props, animates itself.

export interface PetSpriteProps {
  state: PetState;
  tier: PetTier;
  facing: 1 | -1;
  isFlying: boolean;
  isDragging: boolean;
  isSippingCoffee: boolean;
  reducedMotion: boolean;
  petted: boolean;
}

const C = {
  body: '#FF8A5B',
  shade: '#E0673F',
  light: '#FFD3C2',
  dark: '#111111',
  green: '#34D399',
  blue: '#60A5FA',
  red: '#EF4444',
  gold: '#F59E0B',
  slate: '#475569',
  slateLight: '#94A3B8',
  blush: '#FBCFE8',
  coffeeMug: '#8D5B4C',
  coffeeMugLight: '#A36B5B',
} as const;

const PET_CSS = `
.lp-sprite :is(.pet-bob)       { animation: pet-bob 3.2s ease-in-out infinite; }
.lp-sprite :is(.pet-waddle)    { animation: pet-waddle .44s ease-in-out infinite; }
.lp-sprite :is(.pet-hop)       { animation: pet-hop 1.1s cubic-bezier(.3,.7,.4,1) 3; }
.lp-sprite :is(.pet-wiggle)    { animation: pet-wiggle .42s ease-in-out 2; }
.lp-sprite :is(.pet-blink)     { animation: pet-blink 4.6s steps(1,end) infinite; }
.lp-sprite :is(.pet-look)      { animation: pet-look 7.4s ease-in-out infinite; }
.lp-sprite :is(.pet-tail)      { animation: pet-tail-wag .7s ease-in-out infinite; }
.lp-sprite :is(.pet-tail-fast) { animation-name: pet-tail-wag; animation-duration: 0.4s; }
.lp-sprite :is(.pet-ear)       { animation: pet-ear-twitch 2.5s ease-in-out infinite; }
.lp-sprite :is(.pet-wing)      { animation: pet-wing-flap .25s ease-in-out infinite; }
.lp-sprite :is(.pet-wing-r)    { animation: pet-wing-flap-r .25s ease-in-out infinite; }
.lp-sprite :is(.pet-float)     { animation: pet-float 3.2s ease-in-out infinite; }
.lp-sprite :is(.pet-sip)       { animation: pet-sip 1.2s ease-in-out infinite; direction: alternate; }
.lp-sprite :is(.pet-steam)     { animation: pet-steam 1.4s ease-out infinite; }
.lp-sprite :is(.pet-shadow)    { animation: pet-shadow 3.2s ease-in-out infinite; }
.lp-sprite :is(.pet-spark)     { animation: pet-spark 1.4s ease-out infinite; }
.lp-sprite :is(.pet-heart)     { animation: pet-heart 1.1s ease-out both; }
.lp-sprite :is(.pet-drop)      { animation: pet-drop 2s ease-in infinite; }
.lp-sprite :is(.pet-zbud)      { animation: pet-particle 2.2s ease-in-out infinite; }
.lp-sprite :is(.pet-sigh)      { animation: pet-sigh 5.2s ease-in-out infinite; }
.lp-sprite :is(.pet-sleep)     { animation: pet-sleep 3.8s ease-in-out infinite; }
.lp-sprite :is(.pet-dangle)    { animation: pet-dangle 1.6s ease-in-out infinite; }
.lp-sprite :is(.pet-walk-a)    { animation: pet-walk-a .5s ease-in-out infinite; }
.lp-sprite :is(.pet-walk-b)    { animation: pet-walk-b .5s ease-in-out infinite; }
.lp-sprite :is(.pet-paw-lift)  { animation: pet-paw-lift .5s ease-in-out infinite; }
.lp-sprite :is(.pet-pose-sad)  { animation: pet-sigh 5.2s ease-in-out infinite; }
.lp-sprite :is(.pet-pose-sleep){ animation: pet-sleep 3.8s ease-in-out infinite; }
.lp-sprite :is(.pet-pose-tilt) { transform: rotate(-8deg); }

.lp-sprite :is(.pet-bob,.pet-hop,.pet-waddle,.pet-wiggle,.pet-shadow,.pet-float,
  .pet-sip,.pet-tail,.pet-dangle,.pet-pose-sad,.pet-pose-sleep)
  { transform-box: fill-box; transform-origin: 50% 100%; }
.lp-sprite :is(.pet-blink,.pet-look,.pet-spark,.pet-heart,.pet-drop,.pet-zbud,.pet-ear,.pet-wing,.pet-wing-r,.pet-steam,.pet-walk-a,.pet-walk-b,.pet-paw-lift)
  { transform-box: fill-box; transform-origin: 50% 50%; }
.lp-sprite :is(.pet-glow) { filter: drop-shadow(0 0 6px rgba(245,158,11,.5)); }

@keyframes pet-bob        { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.2px); } }
@keyframes pet-waddle     { 0%,100% { transform: translate(.4px,0); } 25% { transform: translate(0,-1px); } 50% { transform: translate(-.4px,0); } 75% { transform: translate(0,-1px); } }
@keyframes pet-hop        { 0% { transform: translateY(0) scale(1,1); } 8% { transform: translateY(.8px) scale(1.06,.9); } 24% { transform: translateY(-6px) scale(.97,1.04); } 42% { transform: translateY(0) scale(1.08,.86); } 54% { transform: translateY(0) scale(1,1); } 70% { transform: translateY(-3.5px) scale(.98,1.03); } 84% { transform: translateY(0) scale(1.05,.9); } 94%,100% { transform: translateY(0) scale(1,1); } }
@keyframes pet-wiggle     { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
@keyframes pet-blink      { 0%,93%,100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
@keyframes pet-look       { 0%,30%,100% { transform: translateX(0); } 38%,52% { transform: translateX(1.5px); } 60%,74% { transform: translateX(-1.5px); } 82% { transform: translateX(0); } }
@keyframes pet-tail-wag   { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(12deg); } }
@keyframes pet-ear-twitch { 0%,100% { transform: rotate(0); } 50% { transform: rotate(10deg); } }
@keyframes pet-walk-a     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes pet-walk-b     { 0%,100% { transform: translateY(-1.5px); } 50% { transform: translateY(0); } }
@keyframes pet-paw-lift   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes pet-wing-flap   { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-25deg); } }
@keyframes pet-wing-flap-r { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(25deg); } }
@keyframes pet-steam      { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-2px); } }
@keyframes pet-float      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes pet-sip        { 0% { transform: rotate(0); } 100% { transform: rotate(10deg); } }
@keyframes pet-shadow     { 0%,100% { opacity: .18; transform: scaleX(1); } 50% { opacity: .12; transform: scaleX(.95); } }
@keyframes pet-spark      { 0% { opacity: 0; transform: scale(.4); } 35% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.2); } }
@keyframes pet-heart      { 0% { opacity: 0; transform: translateY(2px) scale(.6); } 30% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-3px) scale(1); } }
@keyframes pet-drop       { 0% { opacity: 0; transform: translateY(-2px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(3px); } }
@keyframes pet-particle   { 0%,100% { opacity: 0; transform: translateY(2px); } 40%,70% { opacity: 1; transform: translateY(-2px); } }
@keyframes pet-sigh       { 0%,100% { transform: translateY(1px) scaleY(.95); } 50% { transform: translateY(1px) scaleY(.97); } }
@keyframes pet-sleep      { 0%,100% { transform: translateY(2px) scaleY(.7); } 50% { transform: translateY(2px) scaleY(.73); } }
@keyframes pet-dangle     { 0%,100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(4px) rotate(-3deg); } }

.lp-sprite.lp-reduced :is(.pet-bob,.pet-waddle,.pet-hop,.pet-wiggle,.pet-blink,.pet-look,
  .pet-tail,.pet-ear,.pet-wing,.pet-wing-r,.pet-float,.pet-sip,.pet-steam,.pet-shadow,.pet-spark,.pet-heart,
  .pet-drop,.pet-zbud,.pet-sigh,.pet-sleep,.pet-dangle,.pet-walk-a,.pet-walk-b,.pet-paw-lift){ animation: none; }
.lp-sprite.lp-reduced :is(.pet-spark,.pet-zbud) { opacity: .9; }
.lp-sprite.lp-reduced :is(.pet-drop) { opacity: .85; }

@media (prefers-reduced-motion: reduce) {
  .lp-sprite :is(.pet-bob,.pet-waddle,.pet-hop,.pet-wiggle,.pet-blink,.pet-look,
    .pet-tail,.pet-ear,.pet-wing,.pet-wing-r,.pet-float,.pet-sip,.pet-steam,.pet-shadow,.pet-spark,.pet-heart,
    .pet-drop,.pet-zbud,.pet-sigh,.pet-sleep,.pet-dangle,.pet-walk-a,.pet-walk-b,.pet-paw-lift){ animation: none; }
  .lp-sprite :is(.pet-spark,.pet-zbud) { opacity: .9; }
  .lp-sprite :is(.pet-drop) { opacity: .85; }
}
`;

function eyeStyle(state: PetState): {
  lx: number;
  ly: number;
  lrx: number;
  lry: number;
  rx: number;
  ry: number;
  rrx: number;
  rry: number;
} {
  const base = { lx: 40, ly: 46, lrx: 5, lry: 6, rx: 60, ry: 46, rrx: 5, rry: 6 };
  switch (state) {
    case 'sleeping':
      return { ...base, lry: 1.5, rry: 1.5, ly: 48, ry: 48 };
    case 'sad':
      return { ...base, ly: 50, ry: 50, lry: 4.5, rry: 4.5 };
    case 'overwhelmed':
      return { ...base, lrx: 6, lry: 7, rrx: 6, rry: 7, ly: 43, ry: 43 };
    case 'happy':
    case 'welcome-back':
    case 'celebration-streak':
      return { ...base, lry: 3.5, rry: 3.5, ly: 47, ry: 47 };
    case 'curious':
      return { ...base, lrx: 5.5, lry: 6.5, rrx: 5.5, rry: 6.5, ly: 43, ry: 43 };
    case 'focused':
      return { ...base, lry: 5, rry: 5 };
    default:
      return base;
  }
}

function Eyes({ state, reducedMotion }: { state: PetState; reducedMotion: boolean }) {
  const e = eyeStyle(state);
  const sleeping = state === 'sleeping';
  const isCoffeeBreak = state === 'coffee-break';

  if (sleeping) {
    return (
      <g aria-hidden="true">
        <path
          d={`M ${e.lx - e.lrx} ${e.ly} Q ${e.lx} ${e.ly + 2.5} ${e.lx + e.lrx} ${e.ly}`}
          stroke={C.dark}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${e.rx - e.rrx} ${e.ry} Q ${e.rx} ${e.ry + 2.5} ${e.rx + e.rrx} ${e.ry}`}
          stroke={C.dark}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (isCoffeeBreak) {
    // Cozy happy closed-eye arcs ^ ^
    return (
      <g aria-hidden="true">
        <path
          d={`M ${e.lx - e.lrx} ${e.ly + 1} Q ${e.lx} ${e.ly - 3.5} ${e.lx + e.lrx} ${e.ly + 1}`}
          stroke={C.dark}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${e.rx - e.rrx} ${e.ry + 1} Q ${e.rx} ${e.ry - 3.5} ${e.rx + e.rrx} ${e.ry + 1}`}
          stroke={C.dark}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }

  return (
    <g aria-hidden="true">
      <ellipse
        cx={e.lx}
        cy={e.ly}
        rx={e.lrx}
        ry={e.lry}
        fill={C.dark}
        className={!reducedMotion ? 'pet-blink' : undefined}
      />
      <circle cx={e.lx - 1.3} cy={e.ly - 1.8} r={1.4} fill="#fff" opacity={0.9} />
      <ellipse
        cx={e.rx}
        cy={e.ry}
        rx={e.rrx}
        ry={e.rry}
        fill={C.dark}
        className={!reducedMotion ? 'pet-blink' : undefined}
      />
      <circle cx={e.rx - 1.3} cy={e.ry - 1.8} r={1.4} fill="#fff" opacity={0.9} />
    </g>
  );
}

function Mouth({ state }: { state: PetState }) {
  switch (state) {
    case 'happy':
    case 'welcome-back':
    case 'celebration-streak':
      return <path d="M 40 56 Q 50 66 60 56" stroke={C.dark} strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'coffee-break':
      return <path d="M 43 57 Q 50 63 57 57" stroke={C.dark} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
    case 'sad':
      return <path d="M 40 62 Q 50 54 60 62" stroke={C.dark} strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'overwhelmed':
      return (
        <path
          d="M 40 58 Q 44 55 48 58 Q 52 61 56 58 Q 60 55 62 58"
          stroke={C.dark}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'curious':
      return <circle cx={50} cy={58} r={3.5} fill={C.dark} />;
    case 'sleeping':
      return <path d="M 44 56 Q 50 60 56 56" stroke={C.dark} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.6} />;
    default:
      return <path d="M 42 57 Q 50 62 58 57" stroke={C.dark} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
  }
}

function Spark({ x, y, color, delay }: { x: number; y: number; color: string; delay?: number }) {
  return (
    <g className="pet-spark" fill={color} aria-hidden="true" style={delay ? { animationDelay: `${delay}s` } : undefined}>
      <rect x={x - 1.5} y={y} width={3} height={1.2} rx={0.6} />
      <rect x={x} y={y - 1.5} width={1.2} height={3} rx={0.6} />
    </g>
  );
}

function Heart({ x, y, className }: { x: number; y: number; className?: string }) {
  return (
    <g className={className} fill={C.red} aria-hidden="true">
      <circle cx={x + 2.5} cy={y + 2.5} r={2.5} />
      <circle cx={x + 7.5} cy={y + 2.5} r={2.5} />
      <path d={`M ${x} ${y + 3} L ${x + 5} ${y + 9} L ${x + 10} ${y + 3} Z`} />
    </g>
  );
}

function Glyphs({ state, tier, petted }: { state: PetState; tier: PetTier; petted: boolean }) {
  return (
    <g aria-hidden="true">
      {tier === 'active' && (
        <g fill={C.green}>
          <circle cx={56} cy={14} r={3} />
          <rect x={54} y={15} width={3} height={7} rx={1.5} />
        </g>
      )}
      {(state === 'celebration-streak' || tier === 'streak-master') && (
        <g fill={C.gold}>
          <path d="M 38 20 L 43 10 L 48 18 L 52 8 L 56 18 L 61 10 L 66 20 Z" />
          <rect x={38} y={20} width={28} height={3.5} rx={1.5} />
        </g>
      )}
      {state === 'sleeping' && (
        <g fill={C.dark} opacity={0.7}>
          <text x={72} y={22} fontSize={14} fontWeight="bold" className="pet-zbud">
            z
          </text>
          <text x={80} y={16} fontSize={10} fontWeight="bold" className="pet-zbud pet-zb2">
            z
          </text>
          <text x={86} y={12} fontSize={7} fontWeight="bold" className="pet-zbud pet-zb3">
            z
          </text>
        </g>
      )}
      {state === 'curious' && (
        <g fill={C.dark}>
          <text x={74} y={24} fontSize={20} fontWeight="bold" className="pet-look">
            ?
          </text>
        </g>
      )}
      {state === 'thinking' && (
        <g fill={C.dark} opacity={0.7}>
          <circle cx={66} cy={18} r={2.5} className="pet-zbud" />
          <circle cx={74} cy={16} r={2.5} className="pet-zbud pet-zb2" />
          <circle cx={82} cy={14} r={2.5} className="pet-zbud pet-zb3" />
        </g>
      )}
      {state === 'welcome-back' && <Heart x={14} y={12} className="pet-heart" />}
      {state === 'overwhelmed' && (
        <g fill={C.blue}>
          <circle cx={18} cy={40} r={3.5} className="pet-drop" />
          <circle cx={14} cy={48} r={4.5} className="pet-drop pet-zb2" />
          <circle cx={82} cy={40} r={3.5} className="pet-drop" />
          <circle cx={86} cy={48} r={4.5} className="pet-drop pet-zb2" />
        </g>
      )}
      {state === 'focused' && (
        <g fill={C.dark} opacity={0.8}>
          <text x={76} y={22} fontSize={16} fontWeight="bold" className="pet-float">
            ♪
          </text>
        </g>
      )}
      {(state === 'happy' || state === 'celebration-streak') && (
        <g>
          <Spark x={14} y={28} color={C.green} />
          <Spark x={86} y={28} color={C.body} delay={0.3} />
          <Spark x={18} y={78} color={C.body} delay={0.6} />
          <Spark x={82} y={78} color={C.green} delay={0.9} />
          {state === 'celebration-streak' && (
            <>
              <Spark x={34} y={12} color={C.gold} delay={0.15} />
              <Spark x={66} y={12} color={C.gold} delay={0.45} />
            </>
          )}
        </g>
      )}
      {petted && (
        <>
          <Heart x={70} y={12} className="pet-heart" />
          <Spark x={20} y={28} color={C.body} />
        </>
      )}
    </g>
  );
}

function PetSpriteComponent({
  state,
  tier,
  facing,
  isFlying,
  isDragging,
  isSippingCoffee,
  reducedMotion,
  petted,
}: PetSpriteProps) {
  const hop = state === 'happy' || state === 'welcome-back' || state === 'celebration-streak';
  const quiet = state === 'sad' || state === 'sleeping';
  const roaming = state === 'roaming';

  const animClass = isFlying
    ? 'pet-float'
    : hop
      ? 'pet-hop'
      : roaming
        ? 'pet-waddle'
        : quiet
          ? undefined
          : 'pet-bob';

  const poseClass =
    state === 'sad'
      ? 'pet-pose-sad'
      : state === 'sleeping'
        ? 'pet-pose-sleep'
        : state === 'curious'
          ? 'pet-pose-tilt'
          : isDragging
            ? 'pet-dangle'
            : '';

  const tailWagging =
    !reducedMotion &&
    !isDragging &&
    state !== 'sad' &&
    state !== 'sleeping' &&
    state !== 'focused' &&
    state !== 'thinking' &&
    state !== 'curious' &&
    state !== 'overwhelmed';

  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 100 100"
      className={`lp-sprite w-14 h-14 sm:w-20 sm:h-20 ${reducedMotion ? 'lp-reduced' : ''} ${
        tier === 'streak-master' ? 'pet-glow' : ''
      }`}
      aria-hidden="true"
    >
      <style>{PET_CSS}</style>
      <g transform={facing === -1 ? 'scale(-1,1) translate(-100,0)' : undefined}>
        {/* Ground shadow */}
        {!isFlying && !isDragging && (
          <ellipse
            className={hop ? 'pet-shadow pet-shadow-hop' : 'pet-shadow'}
            cx={50}
            cy={96}
            rx={24}
            ry={4}
            fill={C.dark}
            opacity={0.18}
            aria-hidden="true"
          />
        )}

        <g
          className={`${animClass} ${poseClass}${petted && !reducedMotion ? ' pet-wiggle' : ''}`.trim()}
          aria-hidden="true"
        >
          {/* Ears */}
          <path
            d="M 22 34 Q 14 10 28 20 Q 34 30 26 38 Z"
            fill={C.body}
            className={!reducedMotion && state === 'idle' ? 'pet-ear' : undefined}
          />
          <path
            d="M 78 34 Q 86 10 72 20 Q 66 30 74 38 Z"
            fill={C.body}
            className={!reducedMotion && state === 'idle' ? 'pet-ear' : undefined}
          />
          <path d="M 22 34 Q 18 22 26 26" fill={C.shade} opacity={0.35} />
          <path d="M 78 34 Q 82 22 74 26" fill={C.shade} opacity={0.35} />

          {/* Big round HEAD / FACE (main focus) */}
          <ellipse cx={50} cy={48} rx={36} ry={34} fill={C.body} />
          {/* Shade on right */}
          <path
            d="M 72 22 Q 86 30 86 48 Q 86 72 68 78 Q 80 70 80 50 Q 80 32 72 22 Z"
            fill={C.shade}
            opacity={0.45}
          />
          {/* Highlight top-left */}
          <path d="M 26 28 Q 32 22 42 22 Q 34 28 30 40 Q 24 36 26 28 Z" fill={C.light} opacity={0.7} />

          {/* Tiny arms / hands on sides */}
          <g>
            <ellipse cx={16} cy={62} rx={6} ry={10} fill={C.body} transform="rotate(-15 16 62)" />
            <circle cx={14} cy={72} r={5} fill={C.body} />
            <circle cx={14} cy={72} r={3} fill={C.shade} opacity={0.3} />
          </g>
          <g>
            <ellipse cx={84} cy={62} rx={6} ry={10} fill={C.body} transform="rotate(15 84 62)" />
            <circle cx={86} cy={72} r={5} fill={C.body} />
            <circle cx={86} cy={72} r={3} fill={C.shade} opacity={0.3} />
          </g>

          {/* Tiny legs / feet at bottom */}
          {isDragging ? (
            <g className="pet-dangle">
              <g>
                <rect x={36} y={80} width={8} height={12} rx={3} fill={C.body} transform="rotate(8 40 86)" />
                <ellipse cx={40} cy={93} rx={6} ry={4} fill={C.shade} transform="rotate(8 40 93)" />
              </g>
              <g>
                <rect x={56} y={80} width={8} height={12} rx={3} fill={C.body} transform="rotate(-8 60 86)" />
                <ellipse cx={60} cy={93} rx={6} ry={4} fill={C.shade} transform="rotate(-8 60 93)" />
              </g>
            </g>
          ) : (
            <>
              <g>
                <rect x={36} y={78} width={10} height={10} rx={4} fill={C.body} />
                <ellipse cx={41} cy={90} rx={9} ry={5} fill={C.shade} />
                <ellipse cx={41} cy={89} rx={8} ry={4} fill={C.body} />
              </g>
              <g>
                <rect x={54} y={78} width={10} height={10} rx={4} fill={C.body} />
                <ellipse cx={59} cy={90} rx={9} ry={5} fill={C.shade} />
                <ellipse cx={59} cy={89} rx={8} ry={4} fill={C.body} />
              </g>
            </>
          )}

          {/* Tail — short, on right side, above the arm */}
          {tailWagging && (
            <g className="pet-tail pet-tail-fast" transform-box="fill-box" transform-origin="0% 50%">
              <path
                d="M 82 40 Q 92 32 90 22 Q 88 14 94 12"
                stroke={C.body}
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 82 40 Q 92 32 90 22 Q 88 14 94 12"
                stroke={C.shade}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                opacity={0.4}
              />
            </g>
          )}
          {!tailWagging && (
            <g className="pet-tail">
              <path d="M 82 40 Q 90 34 88 26" stroke={C.body} strokeWidth={5} fill="none" strokeLinecap="round" />
            </g>
          )}

          {/* Nose */}
          <ellipse cx={50} cy={54} rx={2.5} ry={2} fill={C.dark} />

          {/* Eyes */}
          <g className={!reducedMotion && state !== 'sleeping' ? 'pet-look' : undefined}>
            <g className={!reducedMotion && state !== 'sleeping' && !isFlying ? 'pet-blink' : undefined}>
              <Eyes state={state} reducedMotion={reducedMotion} />
            </g>
          </g>

          {/* Mouth */}
          <Mouth state={state} />

          {/* Blush */}
          {(state === 'happy' ||
            state === 'celebration-streak' ||
            state === 'welcome-back' ||
            state === 'coffee-break') && (
            <g opacity={0.5}>
              <ellipse cx={28} cy={56} rx={6} ry={3.5} fill={C.blush} />
              <ellipse cx={72} cy={56} rx={6} ry={3.5} fill={C.blush} />
            </g>
          )}

          {/* Belly mark (small) */}
          <ellipse cx={58} cy={66} rx={5} ry={3} fill={C.shade} opacity={0.25} />

          {/* Wings — flutter while flying */}
          {isFlying && (
            <g aria-hidden="true">
              <path
                className="pet-wing"
                d="M 20 44 Q 2 36 4 20 Q 8 34 18 42 Z"
                fill={C.body}
                opacity={0.85}
                transform-box="fill-box"
                transform-origin="100% 50%"
              />
              <path
                className="pet-wing-r"
                d="M 80 44 Q 98 36 96 20 Q 92 34 82 42 Z"
                fill={C.body}
                opacity={0.85}
                transform-box="fill-box"
                transform-origin="0% 50%"
              />
            </g>
          )}

          {/* Steaming coffee mug */}
          {(isSippingCoffee || state === 'coffee-break') && (
            <g className="pet-sip" transform-box="fill-box" transform-origin="50% 50%" aria-hidden="true">
              <rect x={62} y={62} width={16} height={14} rx={3} fill={C.coffeeMug} />
              <rect x={62} y={62} width={16} height={4} rx={2} fill={C.coffeeMugLight} opacity={0.6} />
              <path
                d="M 78 66 Q 84 66 84 72 Q 84 78 78 78"
                stroke={C.coffeeMug}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              <g fill={C.light} className="pet-steam" opacity={0.8}>
                <circle cx={66} cy={56} r={1.5} />
                <circle cx={72} cy={52} r={1.5} />
                <circle cx={68} cy={48} r={1.5} />
              </g>
            </g>
          )}

          {/* Focus laptop */}
          {state === 'focused' && (
            <g aria-hidden="true">
              <rect x={68} y={62} width={24} height={17} rx={2} fill={C.slate} />
              <rect x={70} y={64} width={20} height={13} rx={1} fill={C.slateLight} />
              <rect x={66} y={79} width={28} height={3} rx={1} fill={C.slate} />
            </g>
          )}
        </g>
      </g>
      <Glyphs state={state} tier={tier} petted={petted} />
    </svg>
  );
}

export const PetSprite = memo(PetSpriteComponent);
export default PetSprite;
