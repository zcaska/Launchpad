import { useEffect, useId, useRef, useState } from 'react';
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
import type { CastleCameraCommand, mountCastleScene } from './castleSceneRuntime';

export interface CastleInspection { assetId: string; request: number }
export interface CastleSceneProps {
  ownedIds: readonly string[];
  inspection?: CastleInspection;
  compact?: boolean;
  className?: string;
  id?: string;
}

export const CASTLE_PARTS = BLUEPRINT_PARTS;
export type CastlePartId = string;
const total = CASTLE_PARTS.length;
const loading = 'Loading interactive 3D construction.';

const controls: { action: CastleCameraCommand; label: string; text: string }[] = [
  { action: 'left', label: 'Rotate castle left', text: 'Left' },
  { action: 'right', label: 'Rotate castle right', text: 'Right' },
  { action: 'in', label: 'Zoom into castle', text: '+' },
  { action: 'out', label: 'Zoom out of castle', text: '−' },
  { action: 'reset', label: 'Reset view', text: 'Reset view' },
  { action: 'pan-up', label: 'Pan castle view up', text: '↑' },
  { action: 'pan-down', label: 'Pan castle view down', text: '↓' },
  { action: 'pan-left', label: 'Pan castle view left', text: '←' },
  { action: 'pan-right', label: 'Pan castle view right', text: '→' },
];

export function CastleScene({ ownedIds, inspection, compact = false, className = '', id }: CastleSceneProps) {
  const titleId = useId();
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof mountCastleScene> | null>(null);
  const latestOwnership = useRef(ownedIds);
  const selected = useRef(inspection?.assetId);
  const [selectedId, setSelectedId] = useState(inspection?.assetId);
  const [status, setStatus] = useState(loading);
  const [recovery, setRecovery] = useState(0);
  const owned = new Set(ownedIds);
  const built = CASTLE_PARTS.filter(part => owned.has(part.id));
  const complete = built.length === total;
  const inspected = CASTLE_PARTS.find(part => part.id === selectedId);

  useEffect(() => {
    latestOwnership.current = ownedIds;
    runtime.current?.updateOwnership(ownedIds);
  }, [ownedIds]);

  useEffect(() => {
    if (!inspection) return;
    selected.current = inspection.assetId;
    setSelectedId(inspection.assetId);
    runtime.current?.inspect(inspection.assetId);
  }, [inspection]);

  useEffect(() => {
    let cancelled = false;
    setStatus(loading);
    import('./castleSceneRuntime').then(({ mountCastleScene: mount }) => {
      if (cancelled || !host.current) return;
      runtime.current = mount(host.current, latestOwnership.current, assetId => {
        selected.current = assetId;
        setSelectedId(assetId);
      }, () => setStatus('The 3D graphics context was lost. Restore the 3D view to continue.'), () => setRecovery(value => value + 1));
      if (selected.current) runtime.current.inspect(selected.current);
      setStatus('');
    }).catch(error => {
      if (cancelled) return;
      console.error('3D castle initialization failed', error);
      setStatus('Interactive 3D is unavailable on this device. The construction store is still available.');
    });
    return () => {
      cancelled = true;
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [recovery]);

  const command = (action: CastleCameraCommand) => {
    if (action === 'reset') {
      selected.current = undefined;
      setSelectedId(undefined);
    }
    runtime.current?.command(action);
  };

  return (
    <div id={id} className={`castle-artwork castle-3d ${compact ? 'castle-artwork--compact' : ''} ${className}`}
      data-built-count={built.length} data-phantom-count={total - built.length} data-complete={complete}
      data-inspected-asset={inspected?.id}>
      <h3 id={titleId} className="castle-artwork__accessible">{complete ? 'Your completed stronghold' : built.length ? 'Your rising fortress' : 'Your castle construction site'}</h3>
      <div className="castle-3d__viewport" ref={host} role="img" aria-labelledby={titleId} aria-describedby={`${titleId}-summary`} />
      <p id={`${titleId}-summary`} className="castle-artwork__accessible">
        {built.length} of {total} physical elements built. {built.length < total && 'Unbuilt elements appear as silhouettes. '}
        {built.length > 0 && `Built: ${built.map(part => part.label).join(', ')}. `}
        Drag to orbit. Scroll or use the arrow controls to pan the view; hold Shift or Control while scrolling to zoom. Select an element in the scene or select a purchased material in the store to highlight its location.
      </p>
      {status && <div className="castle-3d__status" role="status">{status}
        {status !== loading && <button type="button" onClick={() => setRecovery(value => value + 1)}>Restore 3D view</button>}
      </div>}
      <div className={inspected ? 'castle-3d__selection' : 'castle-artwork__accessible'} role="status">
        {inspected && <><strong>{inspected.label}</strong><span>{owned.has(inspected.id) ? 'Built' : 'Unbuilt'}</span></>}
      </div>
      <div className="castle-3d__controls" role="group" aria-label="3D castle view">
        {controls.map(({ action, label, text }) => (
          <button key={action} type="button" aria-label={label} disabled={!!status} onClick={() => command(action)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

export default CastleScene;
