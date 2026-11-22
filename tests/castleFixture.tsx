import React from 'react';
import { createRoot } from 'react-dom/client';
import { CastlePanel } from '../src/components/Growth/CastlePanel';
import { activateEconomy } from '../src/utils/castleEconomy';
import { formatDateKey } from '../src/utils/gamification';
import '../src/index.css';
const today = formatDateKey(new Date());
function Fixture() {
  const [economy, setEconomy] = React.useState(() => activateEconomy(5000, today));
  return <CastlePanel economy={economy} today={today} tasks={[]} reflections={[]} currentStreak={0} onBack={() => {}} onEarlierGrowth={() => {}} onPartialProgress={() => {}} onChange={(operation, onFailure) => { try { setEconomy(operation(economy)); } catch (error) { onFailure(String(error)); } }} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
import '../src/components/Growth/CastleScene.css';
import '../src/components/Growth/CastlePanel.css';
import '@fontsource/poppins/400.css';
