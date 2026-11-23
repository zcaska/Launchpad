import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ShoppingBag, Wallet, X } from '@phosphor-icons/react';
import { CastleScene, type CastleInspection } from './CastleScene';
import { CastlePartPreview } from './CastlePartPreview';
import {
  BLUEPRINT_PARTS, CASTLE_DISTRICTS, getBlueprintPrice, getBlueprintProgress,
  getBlueprintLockReason, getOwnedBlueprintIds, purchaseBlueprintPart, resolveBlueprintId, type BlueprintPart,
} from '../../utils/castleBlueprint';
import {
  balanceCents, claimMission, commitOpenTask, getMissionProgress, netWorthCents, previewOpenCommitment,
  remainingMonthlyExemptions, substituteWithOpenTasks, useExemption, type CastleEconomy,
} from '../../utils/castleEconomy';
import type { QuickNote, ReflectionEntry } from '../../types';
import { formatDateKey } from '../../utils/gamification';
import { GuideTarget } from '../Common/GuideTarget';

const money = (cents: number) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;
type District = BlueprintPart['district'];
type Category = BlueprintPart['category'] | 'all';
type CastleDialog = 'store' | 'accountability' | 'ledger';
export type CastleOperation = (current: CastleEconomy, currentTasks: QuickNote[]) => CastleEconomy;
const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'monument', label: 'Monuments' },
  { id: 'fortification', label: 'Fortifications' }, { id: 'decoration', label: 'Decorations' },
  { id: 'companion', label: 'Companions' },
];
const penaltyKinds = new Set(['goal-shortfall', 'missed-commitment', 'replacement-shortfall']);
const ledgerLabels = {
  'goal-shortfall': 'Daily goal shortfall',
  'earning': 'Earnings',
  'missed-commitment': 'Missed commitment',
  'replacement-shortfall': 'Replacement shortfall',
  'asset-purchase': 'Castle purchase',
};

export function CastleStore({ economy, today, onBuy, onSelect }: {
  economy: CastleEconomy;
  today: string;
  onBuy: (assetId: string) => void;
  onSelect: (assetId: string) => void;
}) {
  const [district, setDistrict] = useState<District>(1);
  const [category, setCategory] = useState<Category>('all');
  const storeId = useId();
  const owned = getOwnedBlueprintIds(economy);
  const balance = balanceCents(economy);
  const catalog = BLUEPRINT_PARTS.map(asset => {
    const built = owned.has(asset.id);
    const lock = getBlueprintLockReason(economy, asset, today);
    const price = getBlueprintPrice(asset, economy);
    const state = built ? 'owned' : lock ? 'locked' : balance >= price ? 'available' : 'unaffordable';
    return { asset, built, lock, price, state };
  });
  const districtCounts = CASTLE_DISTRICTS.map(({ number }) => catalog.filter(item => item.asset.district === number && item.built).length);
  const items = catalog.filter(({ asset }) => asset.district === district && (category === 'all' || asset.category === category));

  return (
    <section aria-label="Castle materials">
      <div className="cp-store-tabs" role="tablist" aria-label="Castle districts">
        {CASTLE_DISTRICTS.map(({ number, label }, index) => (
          <button key={number} id={`${storeId}-district-${number}`} role="tab" type="button"
            aria-selected={district === number} aria-controls={`${storeId}-panel`} tabIndex={district === number ? 0 : -1}
            className="cp-tab" onClick={() => setDistrict(number)} onKeyDown={event => {
              const count = CASTLE_DISTRICTS.length;
              const target = event.key === 'ArrowRight' ? (index + 1) % count
                : event.key === 'ArrowLeft' ? (index + count - 1) % count
                : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : undefined;
              if (target === undefined) return;
              event.preventDefault();
              setDistrict(CASTLE_DISTRICTS[target].number);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
            }}>
            <span>{label}</span><small>{districtCounts[index]}/30</small>
          </button>
        ))}
      </div>
      <div className="cp-category-filter" role="group" aria-label="Asset categories">
        {categories.map(item => (
          <button key={item.id} type="button" className="cp-tab" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="cp-store-grid" id={`${storeId}-panel`} role="tabpanel" aria-labelledby={`${storeId}-district-${district}`}>
        {items.map(({ asset, built, lock, price, state }) => {
          const companion = asset.category === 'companion';
          const action = built ? 'Select' : lock ? 'Locked'
            : state === 'unaffordable' ? `Need ${money(price - balance)}` : companion ? 'Adopt' : 'Buy';
          return (
            <article key={asset.id} data-state={state} data-asset={asset.id} className="cp-item-card">
              <div className="cp-item-icon"><CastlePartPreview assetId={asset.id} label={asset.label} /></div>
              <h3 className="cp-item-name">{asset.label}</h3>
              {!built && <div className="cp-item-price">{money(price)}</div>}
              {!built && lock && <p className="cp-item-requirement">{lock}</p>}
              <div className="cp-item-actions">
                <button type="button" className="cp-btn cp-btn-emerald" disabled={!built && state !== 'available'}
                  aria-label={`${action} · ${asset.label}`} onClick={() => built ? onSelect(asset.id) : onBuy(asset.id)}>{action}</button>
              </div>
            </article>
          );
        })}
        {!items.length && <p className="cp-muted">No assets in this category.</p>}
      </div>
    </section>
  );
}

export function CastlePanel({
  economy, today, tasks = [], currentStreak = 0, onBack, onEarlierGrowth, onChange,
  onPartialProgress, onReflectCompleted, onDailyReview,
}: {
  economy: CastleEconomy;
  today: string;
  tasks?: QuickNote[];
  reflections?: ReflectionEntry[];
  currentStreak?: number;
  onBack?: () => void;
  onEarlierGrowth?: () => void;
  onChange: (operation: CastleOperation, onFailure: (message: string) => void) => void;
  onPartialProgress?: (taskId: string) => void;
  onReflectCompleted?: (taskIds: string[]) => void;
  onDailyReview?: () => void;
}) {
  const [error, setError] = useState('');
  const [inspection, setInspection] = useState<CastleInspection>();
  const [selectedTask, setSelectedTask] = useState('');
  const [activeDialog, setActiveDialog] = useState<CastleDialog | null>(null);
  const [exemptionDay, setExemptionDay] = useState<string>();
  const [replacement, setReplacement] = useState<{ day: string; id: string; taskIds: string[] }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  const tasksId = useId();
  const sceneRef = useRef<HTMLDivElement>(null);

  const owned = useMemo(() => getOwnedBlueprintIds(economy), [economy]);
  const ownedIds = useMemo(() => [...owned], [owned]);
  const progress = getBlueprintProgress(economy, today);
  const total = BLUEPRINT_PARTS.length;
  const completion = Math.round(progress.ownedCount / total * 100);
  const balance = balanceCents(economy);
  const castleValue = economy.assets.reduce((sum, asset) => sum + asset.priceCents, 0);
  const netWorth = netWorthCents(economy);
  const historicalAssets = economy.assets.filter(asset => resolveBlueprintId(asset.id) !== asset.id);
  const goal = economy.goalChanges.filter(change => change.effectiveOn <= today).at(-1)?.amountCents ?? economy.goalCents;
  const todayEntries = economy.ledger.filter(entry => entry.date === today);
  const earned = todayEntries.filter(entry => entry.kind === 'earning').reduce((sum, entry) => sum + entry.amountCents, 0);
  const penalties = todayEntries.filter(entry => penaltyKinds.has(entry.kind)).reduce((sum, entry) => sum - entry.amountCents, 0);
  const commitments = economy.commitments.filter(item => item.date === today);
  const candidates = tasks.filter(task => !task.isDone && !task.pendingReflection && !commitments.some(item => item.id === task.id))
    .map(task => ({ task, preview: previewOpenCommitment(economy, task, today) }));
  const candidate = candidates.find(({ task }) => task.id === selectedTask)
    ?? candidates.find(({ preview }) => preview.commitment) ?? candidates[0];
  const commitmentToAdd = candidate?.preview.commitment;
  const pending = tasks.filter(task => task.isDone && task.pendingReflection);
  const todayIsOpen = today >= economy.activatedOn && !todayEntries.some(entry => entry.kind === 'goal-shortfall');
  const exempt = economy.exemptDays.includes(today);
  const exemptions = remainingMonthlyExemptions(economy, today);
  const mission = economy.missions.find(item => item.date === today);
  const missionProgress = mission && getMissionProgress(economy, mission);
  const replacementTasks = candidates.flatMap(({ preview }) => preview.commitment ? [preview.commitment] : []);
  const replacing = todayIsOpen && replacement?.day === today
    ? commitments.find(item => item.id === replacement.id && !item.completed && !item.replacementIds) : undefined;
  const selectedReplacements = replacementTasks.filter(task => replacement?.taskIds.includes(task.id));
  const replacementTotal = selectedReplacements.reduce((sum, task) => sum + task.estimatedValueCents, 0);
  const unavailableReplacement = replacement && replacement.taskIds.length !== selectedReplacements.length;

  useEffect(() => {
    if (activeDialog && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [activeDialog]);

  const openDialog = (next: CastleDialog) => {
    setError('');
    setActiveDialog(next);
  };
  const closeDialog = () => dialog.current?.close();
  const changeToday = (operation: CastleOperation) => {
    setError('');
    onChange((current, currentTasks) => {
      if (today !== formatDateKey(new Date())) throw new Error('The day has changed. Please wait for today’s view to update.');
      return operation(current, currentTasks);
    }, setError);
  };
  const inspect = (assetId: string) => {
    setInspection(previous => ({ assetId, request: (previous?.request ?? 0) + 1 }));
    closeDialog();
    sceneRef.current?.focus({ preventScroll: true });
  };
  const buy = (id: string) => {
    const operation = (current: CastleEconomy) => {
      if (today !== formatDateKey(new Date())) throw new Error('The day has changed. Please wait for today’s view to update.');
      return purchaseBlueprintPart(current, id, today);
    };
    try {
      operation(economy);
      setError('');
      onChange(operation, setError);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not complete this purchase.');
    }
  };

  const storeButton = (
    <button type="button" className="cp-btn cp-store-trigger" aria-haspopup="dialog" onClick={() => openDialog('store')}>
      <ShoppingBag size={18} aria-hidden="true" /> Store
    </button>
  );

  return (
    <section className="castle-panel" aria-label="Your castle">
      <header className="cp-header">
        <div className="cp-title-row">
          {onBack && (
            <GuideTarget id="header.brand" hoverLabel="Dashboard">
              <button type="button" className="cp-btn" onClick={onBack} aria-label="Back to dashboard">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
            </GuideTarget>
          )}
          <h1 className="cp-title">My Castle</h1>
          <GuideTarget id="castle.store" className="cp-store-mobile" hoverLabel="Construction store">
            {storeButton}
          </GuideTarget>
        </div>
        <nav className="cp-actions" aria-label="Castle actions">
          <button type="button" className="cp-btn" aria-haspopup="dialog" onClick={() => openDialog('accountability')}>
            <Wallet size={18} aria-hidden="true" /> Accountability
          </button>
          <button type="button" className="cp-btn" aria-haspopup="dialog" onClick={() => openDialog('ledger')}>
            <BookOpen size={18} aria-hidden="true" /> Ledger
          </button>
          {onDailyReview && (
            <GuideTarget id="castle.reflection" hoverLabel="Daily review">
              <button type="button" className="cp-btn" aria-haspopup="dialog" onClick={onDailyReview}>Daily review</button>
            </GuideTarget>
          )}
          <GuideTarget id="castle.store" className="cp-store-desktop" hoverLabel="Construction store">
            {storeButton}
          </GuideTarget>
        </nav>
      </header>

      <div className="cp-hero-scene" ref={sceneRef} tabIndex={-1} role="region" aria-label="Castle view">
        <GuideTarget id="castle.hero" className="cp-scene-target">
          <CastleScene ownedIds={ownedIds} inspection={inspection} />
        </GuideTarget>
      </div>

      {activeDialog && (
        <dialog ref={dialog} className="cp-dialog" data-panel={activeDialog} aria-labelledby={dialogTitleId}
          onClose={() => { setActiveDialog(null); setExemptionDay(undefined); setReplacement(undefined); }}>
          <header className="cp-dialog-header">
            <div>
              <h2 id={dialogTitleId}>{activeDialog === 'store' ? 'Construction store' : activeDialog === 'ledger' ? 'Ledger' : 'Accountability'}</h2>
              {activeDialog === 'store' && <p className="cp-muted">Cash <strong className="cp-money-cash">{money(balance)}</strong></p>}
            </div>
            <button type="button" className="cp-btn cp-close" onClick={closeDialog} aria-label="Close window"><X size={20} /></button>
          </header>
          {error && <p role="alert" className="cp-error">{error}</p>}
          <div className="cp-dialog-body">
            {activeDialog === 'store' && (
              <CastleStore economy={economy} today={today} onBuy={buy} onSelect={inspect} />
            )}
            {activeDialog === 'accountability' && <>
              <div className="cp-metrics-bar">
                <GuideTarget id="castle.finances" hoverLabel="Castle Treasury" className="w-full">
                  <div className="cp-financial" aria-label={progress.complete ? 'Castle Portfolio' : 'Financial summary'}>
                    <div className="cp-fin-item"><span className="cp-fin-label">Cash</span><span className="cp-fin-value cp-money-cash">{money(balance)}</span></div>
                    <div className="cp-fin-item"><span className="cp-fin-label">Castle</span><span className="cp-fin-value cp-money-castle">{money(castleValue)}</span></div>
                    <div className="cp-fin-item"><span className="cp-fin-label">Net worth</span><span className="cp-fin-value cp-money-net">{money(netWorth)}</span></div>
                  </div>
                </GuideTarget>
                <GuideTarget id="castle.dailyStrip" hoverLabel="Daily momentum" className="w-full">
                  <div className="cp-daily-strip" aria-label="Daily summary">
                    <div className="cp-strip-item"><div className="cp-strip-label">Daily Goal</div><div className="cp-strip-value">{money(Math.min(goal, earned))} / {money(goal)}</div><div className="cp-strip-sub">{earned >= goal ? 'Goal reached' : `${money(goal - earned)} to go`}</div></div>
                    <div className="cp-strip-item"><div className="cp-strip-label">Streak</div><div className="cp-strip-value">{currentStreak}</div><div className="cp-strip-sub">{currentStreak === 1 ? 'day' : 'days'}</div></div>
                    <div className="cp-strip-item"><div className="cp-strip-label">Today’s Earnings</div><div className="cp-strip-value cp-green">{money(earned)}</div><div className="cp-strip-sub">Credited today</div></div>
                    <div className="cp-strip-item"><div className="cp-strip-label">Penalties</div><div className="cp-strip-value cp-red">{money(penalties)}</div><div className="cp-strip-sub">Deductions today</div></div>
                    <div className="cp-strip-item"><div className="cp-strip-label">Debt</div><div className="cp-strip-value">{money(Math.max(0, -balance))}</div><div className="cp-strip-sub">{balance < 0 ? 'Negative balance' : 'No debt'}</div></div>
                  </div>
                </GuideTarget>
              </div>
              <section className="cp-card cp-blueprint-progress" aria-label="Castle progress details">
                <h3>{progress.complete ? 'Castle Complete' : 'Castle Progress'}</h3>
                <div className="cp-journey-counts"><strong>{progress.qualifyingDays} discipline days</strong><strong>{progress.ownedCount}/{total} elements</strong></div>
                <div className="cp-progress-bar" role="progressbar" aria-label="Castle progress" aria-valuemax={total} aria-valuenow={progress.ownedCount}><span style={{ width: `${completion}%` }} /></div>
                <details className="cp-progress-details">
                  <summary>How progress works</summary>
                  <p>Build in any order within an open district. Owning 18 assets in a district opens the next one.</p>
                  <p>The full blueprint costs {money(economy.goalCents * 365)}, or 365 times your starting daily goal of {money(economy.goalCents)}.</p>
                </details>
              </section>
              <section className="cp-card cp-work" aria-label="Daily exemptions">
                <h3>Daily exemptions</h3>
                <p className="cp-muted" aria-live="polite">{exempt ? 'Today is exempt. Today’s penalties are waived, and you can still earn.' : 'An exemption waives today’s missed commitments and goal shortfall.'} {exemptions} of 3 left this month.</p>
                {!exempt && todayIsOpen && exemptions > 0 && (exemptionDay === today ? (
                  <div className="cp-commit-controls" role="group" aria-label="Confirm today's exemption">
                    <button type="button" className="cp-btn cp-btn-emerald" onClick={() => changeToday(current => useExemption(current, today, today))}>Use one exemption today</button>
                    <button type="button" className="cp-btn" onClick={() => setExemptionDay(undefined)}>Cancel</button>
                  </div>
                ) : <button type="button" className="cp-btn cp-work-action" onClick={() => setExemptionDay(today)}>Exempt today</button>)}
              </section>
              {mission && missionProgress && (
                <section className="cp-card cp-work" aria-label="Optional mission">
                  <h3>Optional mission</h3>
                  <p className="cp-muted">Reflect on at least {mission.requiredTasks} commitments earning {money(mission.targetCents)} total today to unlock a {money(mission.bonusCents)} bonus.</p>
                  <p aria-live="polite">{mission.claimed ? `Claimed ${money(mission.bonusCents)}` : `${missionProgress.taskCount} of ${mission.requiredTasks} commitments · ${money(missionProgress.valueCents)} of ${money(mission.targetCents)}`}</p>
                  {!mission.claimed && <button type="button" className="cp-btn cp-btn-emerald cp-work-action" disabled={!todayIsOpen || !missionProgress.ready} onClick={() => changeToday(current => claimMission(current, mission.id, today))}>Claim {money(mission.bonusCents)}</button>}
                </section>
              )}
                <section className="cp-card cp-work" aria-labelledby={tasksId}>
                  <h2 id={tasksId}>Today’s commitments</h2>
                  <p className="cp-muted">Commit before finishing. Reflected work earns castle dollars when the estimate and actual time each reach 30 minutes.</p>
                  {candidates.length ? (
                    <><div className="cp-commit-controls">
                      <label>Task <select className="cp-select" value={candidate?.task.id ?? ''} onChange={event => setSelectedTask(event.target.value)}>
                        {candidates.map(({ task, preview }) => <option key={task.id} value={task.id}>{task.text}{preview.commitment ? ` · ${preview.commitment.estimatedMinutes} min` : ' · Ineligible'}</option>)}
                      </select></label>
                      <button type="button" className="cp-btn cp-btn-emerald" disabled={!commitmentToAdd || !todayIsOpen} onClick={() => {
                        if (!commitmentToAdd) return;
                        changeToday((current, currentTasks) => {
                          const task = currentTasks.find(item => item.id === commitmentToAdd.id);
                          if (!task) throw new Error('This task is no longer available.');
                          return commitOpenTask(current, task, today, commitmentToAdd.estimatedValueCents);
                        });
                      }}>Commit for today</button>
                    </div>
                    <p className="cp-muted" aria-live="polite">{commitmentToAdd ? exempt ? 'Your exemption waives today’s missed commitment penalties.' : `If missed, this commitment costs ${money(commitmentToAdd.estimatedValueCents)}. Any daily goal shortfall is charged separately.` : candidate?.preview.reason}</p></>
                  ) : <p className="cp-muted">Open tasks will appear here.</p>}
                  {commitments.length > 0 && <ul className="cp-work-list">{commitments.map(item => {
                    const task = tasks.find(candidate => candidate.id === item.id);
                    const canReplace = todayIsOpen && !item.completed && !item.replacementIds && !task?.isDone && !task?.pendingReflection
                      && !commitments.some(parent => parent.replacementIds?.includes(item.id)) && replacementTasks.length > 0;
                    return (
                      <li key={item.id}><span>{item.title}</span>
                        {item.completed ? <span>Reflected</span> : item.replacementIds ? <span>Replaced</span>
                          : task?.isDone ? <span>Awaiting reflection</span>
                          : task && onPartialProgress && <button type="button" className="cp-btn" onClick={() => { closeDialog(); onPartialProgress(task.id); }}>Reflect on progress</button>}
                        {canReplace && <button type="button" className="cp-btn" aria-label={`Replace commitment: ${item.title}`} onClick={() => setReplacement({ day: today, id: item.id, taskIds: [] })}>Replace</button>}
                      </li>
                    );
                  })}</ul>}
                  {replacing && <fieldset className="cp-replacement">
                    <legend>Replace {replacing.title}</legend>
                    <p className="cp-muted">Choose tasks with a combined estimate of at least {money(replacing.estimatedValueCents)}. Any remaining shortfall is assessed after reflection unless today is exempt.</p>
                    {replacementTasks.map(task => <label key={task.id}>
                      <input type="checkbox" checked={replacement?.taskIds.includes(task.id) ?? false} onChange={event => {
                        const checked = event.target.checked;
                        setReplacement(current => current && ({ ...current, taskIds: checked ? [...current.taskIds, task.id] : current.taskIds.filter(id => id !== task.id) }));
                      }} /> {task.title} · {money(task.estimatedValueCents)}
                    </label>)}
                    <p aria-live="polite">{unavailableReplacement ? 'A selected task is no longer available. Cancel and choose again.' : `Selected value ${money(replacementTotal)}`}</p>
                    <div className="cp-commit-controls">
                      <button type="button" className="cp-btn cp-btn-emerald" disabled={unavailableReplacement || replacementTotal < replacing.estimatedValueCents} onClick={() => changeToday((current, currentTasks) => substituteWithOpenTasks(current, replacing.id, today, currentTasks, selectedReplacements))}>Confirm replacement</button>
                      <button type="button" className="cp-btn" onClick={() => setReplacement(undefined)}>Cancel</button>
                    </div>
                  </fieldset>}
                  {pending.length > 0 && onReflectCompleted && (
                    <button type="button" className="cp-btn" onClick={() => { closeDialog(); onReflectCompleted(pending.map(task => task.id)); }}>Reflect on completed tasks</button>
                  )}
                </section>

              {onEarlierGrowth && <button type="button" className="cp-btn" onClick={onEarlierGrowth}>View earlier XP progress</button>}
            </>}
            {activeDialog === 'ledger' && <>
              {economy.ledger.length ? <ul className="cp-work-list">
                {[...economy.ledger].reverse().map(entry => <li key={entry.id}><time dateTime={entry.date}>{entry.date}</time><span>{ledgerLabels[entry.kind]}</span><strong>{money(entry.amountCents)}</strong></li>)}
              </ul> : <p className="cp-muted">No entries yet.</p>}
              {historicalAssets.length > 0 && (
                <details><summary>Historical assets ({historicalAssets.length})</summary>
                  <ul className="cp-work-list">{historicalAssets.map(asset => {
                    const current = BLUEPRINT_PARTS.find(part => part.id === resolveBlueprintId(asset.id));
                    return <li key={asset.id}><span>{asset.label}{current && <small className="cp-historical-match">{current.label} in the current castle</small>}</span><strong>{money(asset.priceCents)}</strong></li>;
                  })}</ul>
                </details>
              )}
            </>}
          </div>
        </dialog>
      )}
    </section>
  );
}
