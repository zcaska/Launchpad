import React from 'react';
import { createRoot } from 'react-dom/client';
import { CastlePanel } from '../src/components/Growth/CastlePanel';
import { activateEconomy, commitOpenTask, completeCommitment, offerMission, recordEarning } from '../src/utils/castleEconomy';
import { BLUEPRINT_PARTS, purchaseBlueprintPart } from '../src/utils/castleBlueprint';
import { formatDateKey } from '../src/utils/gamification';
import type { QuickNote } from '../src/types';
import '../src/index.css';
const today = formatDateKey(new Date());
const scenario = new URLSearchParams(window.location.search).get('state');
const fixtureTask = (id: string, text: string, durationMinutes: number): QuickNote => ({
  id, text, durationMinutes, isDone: false, createdAt: 0, priority: 'low',
});
const replaceableTask = fixtureTask('replaceable', 'Original commitment', 60);
const completedMissionTasks = ['one', 'two'].map(id => fixtureTask(`mission-${id}`, `Mission task ${id}`, 180));
const fixtureTasks = scenario === 'accountability' ? [
  replaceableTask,
  fixtureTask('short-task', 'Short task', 15),
  fixtureTask('replacement-one', 'First replacement', 30),
  fixtureTask('replacement-two', 'Second replacement', 30),
  ...completedMissionTasks.map(task => ({ ...task, isDone: true })),
] : [];

function fixtureEconomy() {
  const base = activateEconomy(5000, today);
  if (scenario === 'accountability') {
    let economy = offerMission(commitOpenTask(base, replaceableTask, today), today, 0);
    for (const task of completedMissionTasks) economy = completeCommitment(commitOpenTask(economy, task, today), task.id, today, 3000);
    return economy;
  }
  if (scenario === 'empty' || !scenario) return base;
  let economy = recordEarning(base, 'fixture-grant', today, 2_000_000);
  const first = BLUEPRINT_PARTS.filter(part => part.district === 1);
  const owned = scenario === 'complete' ? BLUEPRINT_PARTS
    : scenario === '17' ? first.slice(0, 17)
    : scenario === '18' ? first.slice(0, 18)
    : scenario === 'companion' ? first.filter(part => part.category === 'companion')
    : [];
  for (const part of owned) economy = purchaseBlueprintPart(economy, part.id, today);
  return economy;
}

function Fixture() {
  const [economy, setEconomy] = React.useState(fixtureEconomy);
  return <CastlePanel economy={economy} today={today} tasks={fixtureTasks} reflections={[]} currentStreak={0} onBack={() => {}} onEarlierGrowth={() => {}} onPartialProgress={() => {}} onChange={(operation, onFailure) => {
    setEconomy(current => {
      try { return operation(current, fixtureTasks); }
      catch (error) { queueMicrotask(() => onFailure(String(error))); return current; }
    });
  }} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
import '../src/components/Growth/CastleScene.css';
import '../src/components/Growth/CastlePanel.css';
import '@fontsource/poppins/400.css';
