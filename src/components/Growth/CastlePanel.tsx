import { useMemo, useState } from 'react';
import { CastleScene } from './CastleScene';
import { CastlePartPreview as StoreThumb } from './CastlePartPreview';
import { useId, useRef } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CastleTurret, Check, Coins, Crown, Cube, Flag, Hammer, House, Sparkle } from '@phosphor-icons/react';
import { CASTLE_PHASES } from './castleCatalog';
import { BLUEPRINT_PARTS, getBlueprintPrice, getBlueprintProgress, getBlueprintLockReason, purchaseBlueprintPart } from '../../utils/castleBlueprint';
import { balanceCents, claimMission, commitTask, netWorthCents, substituteCommitment, taskValueCents, useExemption, type CastleEconomy } from '../../utils/castleEconomy';
import type { QuickNote, ReflectionEntry } from '../../types';
import { formatDateKey } from '../../utils/gamification';
import { GuideTarget } from '../Common/GuideTarget';

const money = (cents: number) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

type StoreTab = 'store' | 'built' | 'upgrades';

export function CastlePanel({ economy, today, tasks = [], reflections: _reflections = [], currentStreak = 0, onBack, onEarlierGrowth, onChange, onPartialProgress, onReflectCompleted, onDailyReview }: { economy: CastleEconomy; today: string; tasks?: QuickNote[]; reflections?: ReflectionEntry[]; currentStreak?: number; onBack?: () => void; onEarlierGrowth?: () => void; onChange: (operation: (current: CastleEconomy) => CastleEconomy, onFailure: (message: string) => void) => void; onPartialProgress?: (taskId: string) => void; onReflectCompleted?: (taskIds: string[]) => void; onDailyReview?: () => void }) {
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [replaceId, setReplaceId] = useState('');
  const [storeTab, setStoreTab] = useState<StoreTab>('store');
  const [activePhase, setActivePhase] = useState(1);
  const storeId = useId();
  const [activeSection, setActiveSection] = useState('Overview');
  const overviewRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDetailsElement>(null);
  const buildRef = useRef<HTMLDetailsElement>(null);
  const accountabilityRef = useRef<HTMLDetailsElement>(null);
  const navigate = (section: string) => {
    setActiveSection(section);
    const target = section === 'Overview' ? overviewRef.current : section === 'Inventory' ? inventoryRef.current : section === 'Ledger' ? ledgerRef.current : section === 'Build' ? buildRef.current : accountabilityRef.current;
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const ownedAssetIds = new Set(economy.assets.map(asset => asset.id));
  const knownOwnedIds = useMemo(() => BLUEPRINT_PARTS.map(asset => asset.id).filter(id => ownedAssetIds.has(id)), [economy.assets]);
  const balance = balanceCents(economy);
  const netWorth = netWorthCents(economy);
  const castleValue = economy.assets.reduce((sum, asset) => sum + asset.priceCents, 0);
  const unknownOwnedCount = economy.assets.filter(asset => !BLUEPRINT_PARTS.some(part => part.id === asset.id)).length;
  const progress = getBlueprintProgress(economy, today);
  const builtKnownCount = progress.ownedCount;
  const constructionProgress = Math.round((builtKnownCount / 120) * 100);
  const isComplete = progress.complete;

  const goal = economy.goalChanges.filter(change => change.effectiveOn <= today).at(-1)?.amountCents ?? economy.goalCents;
  const earnedToday = economy.ledger.filter(entry => entry.date === today && entry.kind === 'earning').reduce((sum, entry) => sum + entry.amountCents, 0);
  const penaltiesToday = economy.ledger.filter(entry => entry.date === today && (entry.kind === 'goal-shortfall' || entry.kind === 'missed-commitment' || entry.kind === 'replacement-shortfall')).reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);
  const exemptionsRemaining = 3 - economy.exemptDays.filter(day => day.slice(0, 7) === today.slice(0, 7)).length;
  const exempt = economy.exemptDays.includes(today);
  const mission = economy.missions.find(item => item.date === today);
  const todayCommitments = economy.commitments.filter(item => item.date === today);
  const completedWork = tasks.filter(task => task.isDone && task.pendingReflection);
  const options = tasks.filter(task => !task.isDone && !todayCommitments.some(item => item.id === task.id));
  const selectedTasks = options.filter(task => selected.includes(task.id));
  const describe = (task: QuickNote) => ({ id: task.id, title: task.text, date: today, estimatedValueCents: taskValueCents(task.durationMinutes ?? 30, task.priority ?? 'medium', task.deadline, today) });

  const act = (operation: (current: CastleEconomy) => CastleEconomy): boolean => {
    try {
      if (today !== formatDateKey(new Date())) throw new Error('The day has changed. Please wait for today’s view to update.');
      operation(economy); // Validate before queuing; the parent reapplies to the latest state.
      onChange(operation, setError); setError('');
      return true;
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not complete this action.'); return false; }
  };

  const nextConstruction = progress.nextPart;
  const catalogItems = BLUEPRINT_PARTS.filter(part => part.phase === activePhase).map(asset => {
    const owned = ownedAssetIds.has(asset.id);
    const lockReason = getBlueprintLockReason(economy, asset, today);
    const priceCents = getBlueprintPrice(asset, economy);
    const affordable = balance >= priceCents;
    const state = owned ? 'owned' : lockReason ? 'locked' : affordable ? 'available' : 'unaffordable';
    return { asset, owned, lockReason, priceCents, affordable, state };
  });
  const storeItems = storeTab === 'built' ? catalogItems.filter(i => i.owned) : storeTab === 'upgrades' ? catalogItems.filter(i => !i.owned) : catalogItems;
  const tabLabel = storeTab === 'store' ? 'Store' : storeTab === 'built' ? 'Built' : 'Upgrades';
  const Hero = <div className={`cp-card cp-hero ${isComplete ? 'cp-hero-complete' : ''}`}>
    <div className="cp-hero-scene"><CastleScene ownedIds={knownOwnedIds} /></div>
    <div className="cp-blueprint-progress"><h2>Castle Progress{isComplete ? ' / Castle Complete' : ''}</h2>
    <div className="cp-journey-counts"><strong>{progress.qualifyingDays}/365 discipline days</strong><strong>{builtKnownCount}/120 elements</strong></div>
    <div className="cp-progress-bar" role="progressbar" aria-label="Castle progress" aria-valuemin={0} aria-valuemax={120} aria-valuenow={builtKnownCount}><span style={{width: `${constructionProgress}%`}} /></div>
    <details className="cp-progress-details"><summary>How progress works</summary><p>Meet your daily goal through reflected work on 365 days. The final piece also requires a year since activation. Missions and exemptions alone do not count.</p><p>Total blueprint: {money(economy.goalCents * 365)}, based on your starting daily goal of {money(economy.goalCents)}.</p>{unknownOwnedCount > 0 && <p>{unknownOwnedCount} historical assets retain their value and do not count toward this blueprint.</p>}</details></div>
  </div>;

  const DailyStrip = (
    <div className="cp-daily-strip" aria-label="Daily summary">
      <div className="cp-strip-item">
        <div className="cp-strip-label">Daily Goal</div>
        <div className="cp-strip-value">{money(Math.min(goal, earnedToday))} / {money(goal)}</div>
        <div className="cp-strip-sub">{earnedToday >= goal ? 'Goal reached' : `${money(goal - earnedToday)} to go`}</div>
      </div>
      <div className="cp-strip-item"><div className="cp-strip-label">Streak</div><div className="cp-strip-value">{currentStreak}</div><div className="cp-strip-sub">{currentStreak === 1 ? 'day' : 'days'}</div></div>
      <div className="cp-strip-item"><div className="cp-strip-label">Today’s Earnings</div><div className="cp-strip-value cp-green">{money(earnedToday)}</div><div className="cp-strip-sub">Credited today</div></div>
      <div className="cp-strip-item"><div className="cp-strip-label">Penalties</div><div className="cp-strip-value cp-red">{money(penaltiesToday)}</div><div className="cp-strip-sub">Deductions today</div></div>
      <div className="cp-strip-item"><div className="cp-strip-label">Debt</div><div className="cp-strip-value">{balance < 0 ? money(Math.abs(balance)) : '$0.00'}</div><div className="cp-strip-sub">{balance < 0 ? 'Negative balance' : 'No debt'}</div></div>
    </div>
  );

  const WorkCard = (
    <section className="cp-card cp-work-card w-full h-full" aria-labelledby="cp-work-heading">
      <div className="cp-card-head">
        <h3 id="cp-work-heading" className="cp-section-title">Today’s Work</h3>
        <span className="cp-badge-count">{todayCommitments.filter(item => item.completed).length} / {todayCommitments.length} Completed</span>
      </div>
      <div className="cp-card-content">
        {todayCommitments.length > 0 ? (
          <ul className="cp-task-list">
            {todayCommitments.map(item => {
              const task = tasks.find(task => task.id === item.id);
              const done = item.completed || !!task?.isDone;
              const minutes = task?.actualMinutes ?? task?.durationMinutes;
              const duration = minutes ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60 ? `${minutes % 60}m` : ''}`.trim() : '—';
              return <li key={item.id} className={`cp-task-item cp-work-item ${done ? 'cp-work-item--done' : ''}`}>
                <span className="cp-task-check" aria-label={done ? 'Completed task' : 'Unfinished task'}>{done && <Check size={16} weight="bold" />}</span>
                <span className="cp-task-title">{item.title}{item.replacementIds && <small>Replaced</small>}</span>
                <span className={`cp-priority cp-priority--${task?.priority || 'medium'}`}>{task?.priority || 'medium'}</span>
                <span className="cp-task-duration">{duration}</span>
                <strong className={done ? 'cp-green' : 'cp-muted'}>{done ? '+' : '~'}{money(item.actualValueCents ?? item.estimatedValueCents)}</strong>
                {!item.completed && !item.replacementIds && task && !task.isDone && onPartialProgress && <button type="button" onClick={() => { if (today !== formatDateKey(new Date())) { setError('The day has changed. Please wait for today’s view to update.'); return; } onPartialProgress(item.id); }} className="cp-task-partial" title="Record partial work" aria-label={`Record partial work for ${item.title}`}>+</button>}
              </li>;
            })}
          </ul>
        ) : <p className="cp-muted" style={{ margin: '14px 0' }}>No commitments selected yet today.</p>}

        <details className="cp-commit-controls" open><summary>Manage today’s commitments</summary>
        {options.length > 0 ? (
          <fieldset style={{ marginTop: 12, border: 'none', padding: 0 }}>
            <div className="cp-checklist">
              {options.map(task => <label key={task.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={selected.includes(task.id)} onChange={event => setSelected(current => event.target.checked ? [...current, task.id] : current.filter(id => id !== task.id))} /><span>{task.text} · estimated {money(describe(task).estimatedValueCents)}</span></label>)}
            </div>
          </fieldset>
        ) : <p className="cp-muted" style={{ marginTop: 10 }}>Add unfinished tasks to choose commitments.</p>}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <label style={{ flex: '1 1 220px' }}><select value={replaceId} onChange={event => setReplaceId(event.target.value)} className="cp-select" style={{ marginTop: 4 }}><option value="">Add new commitments</option>{todayCommitments.filter(item => !item.completed && !item.replacementIds && !todayCommitments.some(parent => parent.replacementIds?.includes(item.id))).map(item => <option key={item.id} value={item.id}>{item.title} · {money(item.estimatedValueCents)}</option>)}</select></label>
          <button type="button" disabled={!selectedTasks.length} onClick={() => { const items = selectedTasks.map(describe); if (act(current => replaceId ? substituteCommitment(current, replaceId, today, items) : items.reduce((state, item) => commitTask(state, item), current))) { setSelected([]); setReplaceId(''); } }} className="cp-btn cp-btn-emerald">{replaceId ? 'Replace commitment' : 'Commit selected tasks'}</button>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" disabled={exempt || exemptionsRemaining <= 0} onClick={() => act(current => useExemption(current, today, today))} className="cp-btn">{exempt ? 'Today is exempt' : 'Use today’s exemption'}</button>
          <span className="cp-muted">Exemptions remaining this month: {exemptionsRemaining}</span>
        </div>
        </details>
      </div>
    </section>
  );

  const ReflectCard = (
    <section className="cp-card cp-reflect-card w-full h-full" aria-labelledby="cp-reflect-heading">
      <div className="cp-card-head">
        <h3 id="cp-reflect-heading" className="cp-section-title">Reflection & Reward</h3>
        <span className="cp-badge-count">{completedWork.length > 0 ? `${completedWork.length} Ready` : 'Gate Locked'}</span>
      </div>
      <div className="cp-card-content">
        <ol className="cp-reward-steps">
          {[{ label: 'Report actual time', desc: 'Verify actual focus minutes invested today', done: completedWork.length > 0 && completedWork.every(task => (task.actualMinutes || 0) > 0) }, { label: 'Answer reflection questions', desc: 'Cement takeaways and insights into growth journal', done: false }, { label: 'Claim earnings', desc: 'Deposit virtual earnings directly to your Castle Treasury', done: false }].map(step => (
            <li key={step.label} className="cp-reward-step-item">
              <span className={`cp-step-check ${step.done ? 'cp-step-check--done' : ''}`}>
                {step.done && <Check size={14} weight="bold" />}
              </span>
              <div className="cp-reward-step-content">
                <strong>{step.label}</strong>
                <small>{step.desc}</small>
              </div>
            </li>
          ))}
        </ol>

        {!completedWork.length && (
          <div className="cp-reflect-hint">
            <span>Complete today’s commitments to activate reflection and claim virtual currency.</span>
          </div>
        )}

        {mission && (
          <div className="cp-mission-card">
            <h4>Daily Mission</h4>
            <p>Complete {mission.requiredTasks} commitments worth {money(mission.targetCents)} today to earn {money(mission.bonusCents)} extra.</p>
            <button type="button" disabled={mission.claimed} onClick={() => act(current => claimMission(current, mission.id, today))} className="cp-btn cp-btn-emerald">
              {mission.claimed ? 'Reward claimed' : 'Claim mission reward'}
            </button>
          </div>
        )}
      </div>

      <div className="cp-reflect-actions" style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button
          type="button"
          disabled={!completedWork.length || !onReflectCompleted}
          onClick={() => onReflectCompleted?.(completedWork.map(task => task.id))}
          className="cp-btn cp-btn-primary cp-continue-reflection"
        >
          Continue Reflection <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );

  const StorePanel = (
    <section className="cp-card cp-store" aria-label="Castle store panel">
      <div className="cp-store-tabs" role="tablist" aria-label="Store tabs">
        {(['store', 'built', 'upgrades'] as StoreTab[]).map(tab => (
          <button key={tab} id={`${storeId}-${tab}`} role="tab" type="button" aria-selected={storeTab === tab} aria-controls={`${storeId}-panel`} tabIndex={storeTab === tab ? 0 : -1} className="cp-tab" onClick={() => setStoreTab(tab)} onKeyDown={event => {
            const tabs: StoreTab[] = ['store', 'built', 'upgrades'];
            const current = tabs.indexOf(tab);
            const index = event.key === 'ArrowRight' ? (current + 1) % 3 : event.key === 'ArrowLeft' ? (current + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
            if (index < 0) return;
            event.preventDefault(); setStoreTab(tabs[index]);
            (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index])?.focus();
          }}>{tab === 'store' ? 'Store' : tab === 'built' ? 'Built' : 'Upgrades'}</button>
        ))}
      </div>
      <div className="cp-store-head">
        <div><h3 style={{ margin: 0, fontSize: 28 }}>Castle {tabLabel}</h3><div className="cp-muted" style={{ fontSize: 13 }}>Phase {activePhase} / 12</div></div>
      </div>
      <label className="cp-phase-filter">Construction phase<select className="cp-select" value={activePhase} onChange={event => setActivePhase(Number(event.target.value))}>{CASTLE_PHASES.map(phase => <option key={phase.number} value={phase.number}>{phase.number}. {phase.label} / days {phase.firstDay}-{phase.lastDay}</option>)}</select></label>
      <div className="cp-store-grid" id={`${storeId}-panel`} role="tabpanel" aria-labelledby={`${storeId}-${storeTab}`}>
        {storeItems.length > 0 ? storeItems.map(({ asset, owned, lockReason, priceCents, affordable, state }) => {
          const buttonLabel = owned ? 'Built' : lockReason ? 'Locked' : affordable ? 'Build' : 'Need more cash';
          return (
            <div key={asset.id} data-state={state} data-asset={asset.id} className="cp-item-card">
              <div className="cp-item-icon"><StoreThumb assetId={asset.id} label={asset.label} /></div>
              <div className="cp-item-name">{asset.label}</div>
              <div className="cp-item-price">{money(priceCents)}</div>
              {owned ? <div className="cp-item-badge cp-item-badge--owned"><Check size={14} weight="bold" /> Built</div> : <details className="cp-item-details"><summary className="cp-item-badge" aria-label={`${asset.label}: ${lockReason || (affordable ? 'Ready to build' : `${money(priceCents - balance)} more cash needed`)}. Show details`}>{lockReason ? `Day ${asset.requiredDays}` : affordable ? 'Ready' : 'Need cash'}</summary><p>{lockReason || 'Unlocked'}{!affordable ? ` · ${money(priceCents - balance)} more needed` : ''}</p></details>}
              <button type="button" disabled={owned || !!lockReason || !affordable} aria-label={buttonLabel === 'Build' ? `Build ${asset.label}` : buttonLabel} onClick={() => act(current => purchaseBlueprintPart(current, asset.id, today))} className="cp-btn cp-btn-emerald" style={{ width: '100%' }}>{buttonLabel}</button>
            </div>
          );
        }) : <p className="cp-muted">No items in this tab.</p>}
      </div>
      {nextConstruction && <div className="cp-next-guidance"><span>Next: <strong>{nextConstruction.label}</strong></span><button type="button" className="cp-btn" onClick={() => { setActivePhase(nextConstruction.phase); setStoreTab('store'); }}>View</button></div>}

    </section>
  );

  const PortfolioSidebar = (
    <aside className="cp-right-col cp-portfolio-sidebar">
      <section className="cp-card cp-side-card cp-portfolio-card">
        <h3 className="cp-section-title"><Crown className="cp-gold" size={26} /> Castle Portfolio</h3>
        <div className="cp-side-list">
          <div className="cp-row"><span><Coins size={23} /> Cash Balance</span><strong className="cp-money-cash">{money(balance)}</strong></div>
          <div className="cp-row"><span><Cube size={23} /> Castle Value</span><strong className="cp-money-castle">{money(castleValue)}</strong></div>
          <div className="cp-row"><span><Crown size={23} className="cp-gold" /> Net worth</span><strong>{money(netWorth)}</strong></div>
        </div>
      </section>
      <section className="cp-card cp-side-card cp-completion-card">
        <div className="cp-row"><h3 className="cp-section-title"><Check size={25} className="cp-green" /> Castle Progress</h3><strong className="cp-green">{constructionProgress}%</strong></div>
        <div className="cp-completion-track" role="progressbar" aria-label="Castle completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={constructionProgress}><span style={{ width: `${constructionProgress}%` }} /></div>
        <p>All structures built <Check size={20} className="cp-green" /><span className="cp-sr-only">{builtKnownCount}/{BLUEPRINT_PARTS.length} built ({constructionProgress}%)</span></p>
      </section>
      <button type="button" className="cp-card cp-side-card cp-next-chapter" onClick={() => navigate('Build')}><Sparkle size={28} className="cp-green" /><span><strong>Next Chapter</strong><small>Expand · Upgrade · Personalize</small></span><ArrowRight size={24} /></button>
      <span className="cp-sr-only">Your stronghold is complete.</span>
    </aside>
  );

  return (
    <section className={`castle-panel ${isComplete ? 'castle-panel--complete' : ''}`} aria-label="Your castle">
      <header className="cp-header">
        <div className="cp-header-top">
          <div className="cp-title-row">
            {onBack && (
              <GuideTarget id="header.brand" hoverLabel="Dashboard">
                <button
                  type="button"
                  className={`cp-back ${isComplete ? 'cp-back--icon' : ''}`}
                  onClick={onBack}
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft size={24} />
                  {!isComplete && <span>Dashboard</span>}
                </button>
              </GuideTarget>
            )}
            <CastleTurret className="cp-castle-icon" size={38} weight="fill" aria-hidden="true" />
            <GuideTarget id="castle.hero" hoverLabel="My Castle guide">
              <h1 className="cp-title">
                My Castle {!isComplete && <span className="cp-on-pill"><i /> Accountability Mode: On</span>}
              </h1>
            </GuideTarget>
          </div>
          {isComplete ? (
            <nav className="cp-overview-nav" aria-label="Castle sections">
              {([{ label: 'Overview', icon: House }, { label: 'Build', icon: Hammer }, { label: 'Inventory', icon: Cube }, { label: 'Ledger', icon: BookOpen }, { label: 'Missions', icon: Flag }]).map(({ label, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  aria-current={activeSection === label ? 'page' : undefined}
                  onClick={() => navigate(label)}
                >
                  <Icon size={23} />
                  {label}
                </button>
              ))}
              {onDailyReview && (
                <GuideTarget id="castle.reflection" hoverLabel="Daily review">
                  <button type="button" onClick={onDailyReview} className="cp-overview-review-btn">
                    <BookOpen size={23} />
                    Daily review
                  </button>
                </GuideTarget>
              )}
            </nav>
          ) : (
            onDailyReview && (
              <div className="cp-header-right">
                <GuideTarget id="castle.reflection" hoverLabel="Daily review">
                  <button
                    type="button"
                    onClick={onDailyReview}
                    className="cp-btn cp-daily-review-btn"
                    aria-label="Daily review"
                  >
                    <BookOpen size={18} />
                    <span>Daily review</span>
                  </button>
                </GuideTarget>
              </div>
            )
          )}
        </div>

        {!isComplete && (
          <div className="cp-metrics-bar">
            <GuideTarget id="castle.finances" hoverLabel="Castle Treasury" className="cp-metrics-treasury-target">
              <div className="cp-financial" aria-label="Financial summary">
                <div className="cp-fin-item"><span className="cp-fin-label">Cash</span><span className="cp-fin-value cp-money-cash">{money(balance)}</span></div>
                <div className="cp-fin-item"><span className="cp-fin-label">Castle</span><span className="cp-fin-value cp-money-castle">{money(castleValue)}</span></div>
                <div className="cp-fin-item"><span className="cp-fin-label">Net worth</span><span className="cp-fin-value cp-money-net">{money(netWorth)}</span></div>
              </div>
            </GuideTarget>

            <GuideTarget id="castle.dailyStrip" hoverLabel="Daily momentum" className="cp-metrics-strip-target">
              {DailyStrip}
            </GuideTarget>
          </div>
        )}
      </header>

      {!isComplete ? (
        <div className="cp-main-grid">
          <div className="cp-main-hero">
            <GuideTarget id="castle.hero" hoverLabel="3D Stronghold" className="w-full">
              {Hero}
            </GuideTarget>
          </div>
          <div className="cp-main-store">
            <GuideTarget id="castle.store" hoverLabel="Construction store" className="w-full">
              {StorePanel}
            </GuideTarget>
          </div>
          <div className="cp-work-row cp-main-work">
            <GuideTarget id="castle.commitments" hoverLabel="Today's commitments" className="w-full h-full flex flex-col">
              {WorkCard}
            </GuideTarget>
            <GuideTarget id="castle.reflection" hoverLabel="Reflection gate" className="w-full h-full flex flex-col">
              {ReflectCard}
            </GuideTarget>
          </div>
        </div>
      ) : (
        <>
          <div className="cp-complete-grid" ref={overviewRef}>
            <div className="cp-left-col">{Hero}</div>
            {PortfolioSidebar}
          </div>
          <div className="cp-stronghold-row">
            <section className="cp-card cp-stronghold-description"><Sparkle size={27} className="cp-green" /><div><h3>The Stronghold</h3><p>A complete fortress — a reflection of your discipline, focus, and persistence.</p><span><Crown size={16} /> Final Form</span></div></section>
            <section className="cp-card cp-structure-counts" aria-label="Built structures">{CASTLE_PHASES.map(phase => <div key={phase.number}><Cube size={28}/><span>{phase.label}</span><strong>{BLUEPRINT_PARTS.filter(part => part.phase === phase.number && ownedAssetIds.has(part.id)).length} / 10</strong></div>)}</section>
          </div>
          <div className="cp-card cp-generic cp-inventory" ref={inventoryRef}>
            <h3 className="cp-section-title"><Cube size={25} className="cp-green" /> Owned Elements ({builtKnownCount})</h3>
            <div className="cp-owned-grid">
              <p>All 120 elements are owned. Browse each phase in the construction store Built view.</p>
            </div>
          </div>
          <details className="cp-card cp-generic" style={{ marginTop: 18 }} ref={buildRef}><summary>Construction store</summary><div className="cp-accordion-body">{StorePanel}</div></details>
          <details className="cp-card cp-generic" style={{ marginTop: 18 }} ref={accountabilityRef}>
            <summary style={{ padding: '14px 16px', cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>Accountability</summary>
            <div style={{ padding: '0 16px 16px' }}>
              {DailyStrip}
              <div className="cp-work-row" style={{ marginTop: 16 }}>{WorkCard}{ReflectCard}</div>
            </div>
          </details>
        </>
      )}

      {unknownOwnedCount > 0 && <details className="cp-card cp-generic"><summary>Historical assets ({unknownOwnedCount})</summary><ul>{economy.assets.filter(asset => !BLUEPRINT_PARTS.some(part => part.id === asset.id)).map(asset => <li key={asset.id}>{asset.label} / {money(asset.priceCents)}</li>)}</ul><p>Original purchase values and ledger entries are preserved.</p></details>}

      {onEarlierGrowth && <button type="button" className="cp-earlier-growth" onClick={onEarlierGrowth}>View earlier XP progress <ArrowRight size={16} /></button>}

      {error && <p role="alert" className="cp-error" style={{ marginTop: 12 }}>{error}</p>}
    </section>
  );
}
