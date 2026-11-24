import { cx } from '../ui.jsx';

const chip = (x) =>
  x === 'W'
    ? 'bg-neg/15 border-neg/40 text-neg'
    : x === 6
      ? 'bg-accent/15 border-accent/40 text-accent'
      : x === 4
        ? 'bg-four/15 border-four/40 text-four'
        : 'bg-deep border-line text-fg';

/** Current over as scoreboard chips: red wicket, gold six, blue four */
export default function OverTracker({ balls, overNo }) {
  const slots = Array.from({ length: 6 }, (_, i) => balls[i]);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-fg3 w-14 shrink-0">
        Over <span className="font-mono text-fg2">{overNo}</span>
      </span>
      <div className="flex gap-1.5">
        {slots.map((x, i) => (
          <span
            key={i}
            className={cx(
              'w-9 h-9 md:w-10 md:h-10 grid place-items-center rounded-md border font-mono tabular-nums text-sm',
              x === undefined ? 'border-dashed border-line text-fg3/40' : chip(x),
              x !== undefined && i === balls.length - 1 && 'animate-pop',
            )}
          >
            {x === undefined ? '' : x}
          </span>
        ))}
      </div>
    </div>
  );
}
