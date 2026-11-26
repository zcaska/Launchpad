import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { clampDialHour, getDialAngle, getDialAngleDelta, getHourAtDialAngle } from '../Dashboard/durationDial';

export type DurationUnit = 'hours' | 'minutes';

interface DurationDialProps {
  unit: DurationUnit;
  value: string;
  maximum: number;
  onChange: (value: string) => void;
  showExactInput?: boolean;
  size?: 'small' | 'normal' | 'large';
}

const clockMarks = Array.from({ length: 12 }, (_, index) => {
  const radians = index * Math.PI / 6;
  return { left: 50 + 35 * Math.sin(radians), top: 50 - 35 * Math.cos(radians) };
});

export function DurationDial({ unit, value, maximum, onChange, showExactInput = true, size = 'normal' }: DurationDialProps) {
  const clock = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; previousAngle: number; accumulatedAngle: number; startHour: number; moved: boolean } | null>(null);
  const suppressDraggedClick = useRef(false);
  const isHours = unit === 'hours';
  const parsed = Number(value);
  const selected = value !== '' && Number.isSafeInteger(parsed) && (isHours || parsed <= 59);
  const baseHour = isHours && selected && parsed <= maximum ? Math.floor(parsed / 12) * 12 : 0;
  const handAngle = isHours ? (parsed % 12) * 30 : parsed * 6;
  const label = isHours ? 'Hours' : 'Minutes';

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isHours || event.button !== 0 || !clock.current) return;
    const angle = getDialAngle(event.clientX, event.clientY, clock.current.getBoundingClientRect());
    const clickedMark = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-dial-value]');
    const hourAtStart = clickedMark ? Number(clickedMark.dataset.dialValue) : getHourAtDialAngle(angle, baseHour);
    const startHour = clampDialHour(hourAtStart, maximum);
    drag.current = { pointerId: event.pointerId, previousAngle: angle, accumulatedAngle: 0, startHour, moved: false };
    clock.current.setPointerCapture(event.pointerId);
    onChange(String(startHour));
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!isHours || !active || active.pointerId !== event.pointerId || !clock.current) return;
    const angle = getDialAngle(event.clientX, event.clientY, clock.current.getBoundingClientRect());
    const delta = getDialAngleDelta(active.previousAngle, angle);
    if (Math.abs(delta) >= 1) active.moved = true;
    active.accumulatedAngle += delta;
    active.previousAngle = angle;
    onChange(String(clampDialHour(active.startHour + Math.round(active.accumulatedAngle / 30), maximum)));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, pointerClickFollows: boolean) => {
    const active = drag.current;
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (pointerClickFollows && active?.moved) {
      suppressDraggedClick.current = true;
      window.setTimeout(() => { suppressDraggedClick.current = false; }, 0);
    }
    if (clock.current?.hasPointerCapture(event.pointerId)) clock.current.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={`flex ${size === 'large' ? 'w-full max-w-60' : size === 'small' ? 'w-full max-w-40' : 'max-w-44 flex-[1_1_8.75rem]'} flex-col items-center gap-2`}>
      <span className="text-sm font-semibold">{label}</span>
      <div
        ref={clock}
        role="group"
        aria-label={`${label} on the clock`}
        onPointerDown={isHours ? beginDrag : undefined}
        onPointerMove={isHours ? moveDrag : undefined}
        onPointerUp={isHours ? event => endDrag(event, true) : undefined}
        onPointerCancel={isHours ? event => endDrag(event, false) : undefined}
        onLostPointerCapture={isHours ? event => endDrag(event, false) : undefined}
        onClickCapture={isHours ? event => {
          if (!suppressDraggedClick.current || event.detail === 0) return;
          event.preventDefault();
          event.stopPropagation();
          suppressDraggedClick.current = false;
        } : undefined}
        className={`relative aspect-square w-full select-none rounded-full border border-serene-border-light bg-serene-bg-light dark:border-serene-border-dark dark:bg-serene-bg-dark ${isHours ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-[4%] rounded-full border border-serene-border-light dark:border-serene-border-dark" />
        {selected && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1/2 left-1/2 w-0.5 origin-bottom rounded-full bg-serene-primary motion-safe:transition-transform motion-safe:duration-150 dark:bg-serene-primary-dark ${isHours ? 'h-[23%]' : 'h-[29%]'}`}
            style={{ transform: `translateX(-50%) rotate(${handAngle}deg)` }}
          />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-serene-primary dark:bg-serene-primary-dark" />
        {clockMarks.map(({ left, top }, index) => {
          const mark = isHours ? baseHour + index : index * 5;
          const isSelected = selected && mark === parsed;
          return (
            <button
              key={index}
              type="button"
              data-dial-value={isHours ? mark : undefined}
              disabled={mark > maximum}
              aria-label={`Set ${unit} to ${mark}`}
              aria-pressed={isSelected}
              onClick={() => onChange(String(mark))}
              className={`absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-semibold tabular-nums focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serene-primary disabled:opacity-35 dark:focus-visible:outline-serene-primary-dark sm:size-7 ${isSelected ? 'bg-serene-primary text-white dark:bg-serene-primary-dark dark:text-serene-bg-dark' : 'enabled:hover:bg-serene-primary/15 dark:enabled:hover:bg-serene-primary-dark/15'} ${mark > 999 ? 'text-[9px]' : 'text-xs'}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {isHours ? mark : String(mark).padStart(2, '0')}
            </button>
          );
        })}
      </div>
      {showExactInput && <input
        type="text"
        aria-label={`Exact ${unit}`}
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={event => {
          const digits = event.currentTarget.value.trim();
          if (/^[0-9]*$/.test(digits)) onChange(digits);
        }}
        className="w-20 rounded-lg border border-serene-border-light bg-serene-surface-light px-2 py-1.5 text-center text-base font-semibold tabular-nums placeholder:text-serene-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-serene-primary dark:border-serene-border-dark dark:bg-serene-surface-dark dark:placeholder:text-serene-text-darkMuted dark:focus-visible:outline-serene-primary-dark"
      />}
    </div>
  );
}
