import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Copy
} from '@phosphor-icons/react';
import { Mascot } from './Mascot';
import {
  MASCOT_PALETTE,
  MASCOT_EXPRESSIONS,
  MASCOT_STATE_POSES,
  MASCOT_SIZING,
  MASCOT_ANIMATION_CONTRACT,
  MascotExpressionId,
  MascotPoseId,
} from './mascotManifest';

export interface MascotShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPRESSIONS_LIST: MascotExpressionId[] = [
  'calm',
  'curious',
  'welcoming',
  'happy',
  'surprised',
  'disappointed',
  'sleepy',
  'excited',
  'focused',
  'determined',
];

const POSES_LIST: MascotPoseId[] = [
  'idle',
  'focus',
  'low_energy',
  'task_completion',
  'return_after_away',
];

export function MascotShowcaseModal({ isOpen, onClose }: MascotShowcaseModalProps) {
  const [activeTab, setActiveTab] = useState<'sheet' | 'interactive' | 'sizes' | 'contract'>('sheet');
  const [interactiveExpr, setInteractiveExpr] = useState<MascotExpressionId>('curious');
  const [leftFin, setLeftFin] = useState<number>(12);
  const [rightFin, setRightFin] = useState<number>(-4);
  const [glow, setGlow] = useState<boolean>(true);
  const [sparkles, setSparkles] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopyManifest = () => {
    navigator.clipboard?.writeText(JSON.stringify(MASCOT_ANIMATION_CONTRACT, null, 2));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#1a1f26] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden select-text text-stone-800 dark:text-stone-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#151920]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Mascot size={32} expression="welcoming" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                Launchpad Mascot Design Reference
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                  Canon 2.0
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Floating-pebble companion • 2D/2.5D soft matte finish • Independent parts & expressions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close showcase modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1a1f26] text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'sheet'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Mascot Model Sheet (All 10 Expressions)
          </button>
          <button
            onClick={() => setActiveTab('interactive')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'interactive'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Interactive Rig & Fin Sandbox
          </button>
          <button
            onClick={() => setActiveTab('sizes')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'sizes'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Theme & Sizing Matrix (24px to 120px)
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'contract'
                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Animation Contract & SVG Manifest
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* TAB 1: Model Sheet */}
          {activeTab === 'sheet' && (
            <div className="space-y-6">
              {/* Canonical Character Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 shrink-0 flex items-center justify-center p-2 rounded-2xl bg-[#13171d] border border-stone-800 shadow-inner">
                  <Mascot size={100} expression="welcoming" glow={true} />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Canonical Neutral Character Illustration
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    A tiny, friendly alien companion with an original floating-pebble silhouette. Compact, softly asymmetrical, organic, and instantly recognizable at small sizes. Warm coral-orange (<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-orange-500 font-mono text-[11px]">#FF7A3C</code>) with soft matte shading, diffused highlights, and lighter coral side fins (<code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-orange-400 font-mono text-[11px]">#FF9A6B</code>).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Zero Limbs (No legs/arms)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Adaptive Minimal Eyes
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Controllable Fins
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Pure Character (No accessories)
                    </span>
                  </div>
                </div>
              </div>

              {/* All 10 Expressions Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                  10 Standard Expressions (Reference Sheet Parity)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {EXPRESSIONS_LIST.map((exprId) => {
                    const cfg = MASCOT_EXPRESSIONS[exprId];
                    return (
                      <div
                        key={exprId}
                        className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#13171d] border border-stone-200 dark:border-stone-800 flex flex-col items-center text-center gap-2 hover:border-orange-500/40 transition-colors"
                      >
                        <div className="h-20 w-20 flex items-center justify-center">
                          <Mascot size={72} expression={exprId} glow={false} />
                        </div>
                        <div className="font-bold text-xs capitalize text-stone-900 dark:text-stone-100">
                          {cfg.label}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">
                          {cfg.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4 State / Pose References */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                  Key Context-Aware State Poses
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {POSES_LIST.filter((p) => p !== 'idle').map((poseId) => {
                    const pose = MASCOT_STATE_POSES[poseId];
                    return (
                      <div
                        key={poseId}
                        className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#13171d] border border-stone-200 dark:border-stone-800 flex flex-col items-center text-center gap-2"
                      >
                        <div className="h-20 w-20 flex items-center justify-center">
                          <Mascot size={72} pose={poseId} />
                        </div>
                        <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {pose.label}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          {pose.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Rig Sandbox */}
          {activeTab === 'interactive' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 flex flex-col items-center justify-center p-8 rounded-2xl bg-[#13171d] border border-stone-800 min-h-[300px]">
                <Mascot
                  size={140}
                  expression={interactiveExpr}
                  leftFinAngle={leftFin}
                  rightFinAngle={rightFin}
                  glow={glow}
                  sparkles={sparkles}
                />
                <div className="mt-4 px-3 py-1 rounded-full bg-white/10 text-white font-mono text-xs">
                  Active Expression: {interactiveExpr} (L: {leftFin}°, R: {rightFin}°)
                </div>
              </div>

              <div className="md:col-span-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Animation Agent Live Control Sliders
                </h4>

                <div>
                  <label className="text-xs font-semibold block text-stone-700 dark:text-stone-300 mb-1">
                    Select Base Expression
                  </label>
                  <select
                    value={interactiveExpr}
                    onChange={(e) => {
                      const next = e.target.value as MascotExpressionId;
                      setInteractiveExpr(next);
                      setLeftFin(MASCOT_EXPRESSIONS[next].leftFinAngle);
                      setRightFin(MASCOT_EXPRESSIONS[next].rightFinAngle);
                    }}
                    className="w-full text-xs p-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white"
                  >
                    {EXPRESSIONS_LIST.map((exprId) => (
                      <option key={exprId} value={exprId}>
                        {MASCOT_EXPRESSIONS[exprId].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    <span>Left Fin Angle (Degrees)</span>
                    <span className="font-mono text-orange-500">{leftFin}°</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="35"
                    value={leftFin}
                    onChange={(e) => setLeftFin(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>-30° (Droop / Sad)</span>
                    <span>0° (Rest)</span>
                    <span>+35° (Lift / Joy)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    <span>Right Fin Angle (Degrees)</span>
                    <span className="font-mono text-orange-500">{rightFin}°</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="35"
                    value={rightFin}
                    onChange={(e) => setRightFin(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>-30° (Droop / Sad)</span>
                    <span>0° (Rest)</span>
                    <span>+35° (Lift / Joy)</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={glow}
                      onChange={(e) => setGlow(e.target.checked)}
                      className="accent-orange-500 rounded"
                    />
                    <span>Ambient Glow (#FF7A3C)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sparkles}
                      onChange={(e) => setSparkles(e.target.checked)}
                      className="accent-orange-500 rounded"
                    />
                    <span>Celebration Sparkles</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Theme & Sizing Matrix */}
          {activeTab === 'sizes' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                  Sizing Legibility Audit (Micro to Hero)
                </h4>
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#13171d]">
                  <div className="flex flex-wrap items-end gap-6 justify-around">
                    {Object.entries(MASCOT_SIZING.sizes).map(([key, item]) => (
                      <div key={key} className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10">
                          <Mascot size={item.size} expression="welcoming" glow={item.size >= 64} />
                        </div>
                        <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 text-center">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dark vs Light Theme Comparison */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                  Theme Contrast & Edge Clarity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark UI Background */}
                  <div className="p-6 rounded-xl bg-[#13171d] border border-stone-800 flex flex-col items-center gap-3">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Launchpad Dark Charcoal (#13171d)</span>
                    </div>
                    <Mascot size={90} expression="welcoming" glow={true} />
                    <p className="text-[11px] text-stone-400 text-center">
                      Clean anti-aliased edges, subtle ambient aura, no black haloing.
                    </p>
                  </div>

                  {/* Light UI Background */}
                  <div className="p-6 rounded-xl bg-[#faf9f5] border border-stone-200 flex flex-col items-center gap-3">
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span>Launchpad Light Serene (#FAF9F5)</span>
                    </div>
                    <Mascot size={90} expression="welcoming" glow={false} />
                    <p className="text-[11px] text-stone-600 text-center">
                      Warm coral tones stand out with soft matte contrast and sharp facial features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Exact Palette Values */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
                  Verified Palette Values
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow" style={{ background: MASCOT_PALETTE.baseOrange }} />
                    <div className="font-bold text-[11px]">Base Orange</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.baseOrange}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow" style={{ background: MASCOT_PALETTE.finOrange }} />
                    <div className="font-bold text-[11px]">Fin Orange</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.finOrange}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow" style={{ background: MASCOT_PALETTE.highlight }} />
                    <div className="font-bold text-[11px]">Highlight</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.highlight}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow" style={{ background: MASCOT_PALETTE.shadow }} />
                    <div className="font-bold text-[11px]">Shadow</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.shadow}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow" style={{ background: MASCOT_PALETTE.eyeDark }} />
                    <div className="font-bold text-[11px]">Eye Dark</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.eyeDark}</div>
                  </div>
                  <div className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <div className="w-8 h-8 mx-auto rounded-full mb-1.5 shadow border border-stone-300" style={{ background: MASCOT_PALETTE.eyeHighlight }} />
                    <div className="font-bold text-[11px]">Specular</div>
                    <div className="font-mono text-[10px] text-stone-500">{MASCOT_PALETTE.eyeHighlight}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Animation Contract */}
          {activeTab === 'contract' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Animation Agent Component Interface & Pivot Contract
                </h4>
                <button
                  onClick={handleCopyManifest}
                  className="px-2.5 py-1 text-xs rounded-md bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 font-mono text-xs text-stone-200 overflow-x-auto border border-stone-800">
                <pre>{JSON.stringify(MASCOT_ANIMATION_CONTRACT, null, 2)}</pre>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-2 text-stone-700 dark:text-stone-300">
                <p className="font-bold text-orange-600 dark:text-orange-400">
                  🤝 Integration Agreement with Animation Agent:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    <strong>Visual Layer:</strong> This agent delivers all vector geometry, semantic SVG selectors (<code className="font-mono text-orange-500">[data-part="fin-left"]</code>, etc.), responsive scale, and 10 expression shapes.
                  </li>
                  <li>
                    <strong>Animation Layer:</strong> The animation agent controls floating translation timelines, physics springs, wander trajectories, thought bubble placement, and fin flapping angles around pivots <code className="font-mono text-orange-500">(26, 54)</code> and <code className="font-mono text-orange-500">(94, 54)</code>.
                  </li>
                  <li>
                    <strong>Zero Redraw:</strong> No redrawing of the character is required for motion. Any animation engine (GSAP, Framer Motion, CSS Keyframes) can target the parts directly.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#151920] text-xs">
          <div className="text-stone-500 dark:text-stone-400 text-[11px]">
            SVG Assets available in <code className="font-mono text-orange-500">public/assets/mascot/</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MascotShowcaseModal;
