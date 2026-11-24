import { forwardRef } from 'react';

export const cx = (...c) => c.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-fg text-deep hover:bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
  accent: 'bg-accent text-accent-ink hover:bg-[#f4c165]',
  secondary: 'bg-raised text-fg border border-line hover:bg-raised2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  ghost: 'text-fg2 hover:text-fg hover:bg-raised',
  danger: 'bg-raised text-neg border border-line hover:bg-raised2',
};
const SIZE = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-[10px]',
  icon: 'h-9 w-9 justify-center rounded-lg',
};

export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', className, ...p }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center font-medium select-none whitespace-nowrap',
        'transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.98]',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        BTN[variant],
        SIZE[size],
        className,
      )}
      {...p}
    />
  );
});

export function Card({ className, as: As = 'div', ...p }) {
  return <As className={cx('bg-card border border-line rounded-2xl', className)} {...p} />;
}

export function SectionLabel({ children, className, right }) {
  return (
    <div className={cx('flex items-center justify-between mb-3', className)}>
      <h2 className="text-[13px] text-fg2">{children}</h2>
      {right}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...p }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-10 w-full rounded-lg bg-raised border border-line px-3 text-sm text-fg placeholder:text-fg3',
        'transition-[border-color,background-color] duration-150 ease-out',
        'focus:outline-none focus:border-line2 focus:bg-raised2',
        className,
      )}
      {...p}
    />
  );
});

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] text-fg2 mb-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-fg3 mt-2">{hint}</span>}
    </label>
  );
}

/** Segmented control */
export function Seg({ options, value, onChange, disabled, className }) {
  return (
    <div className={cx('inline-flex p-1 rounded-[10px] bg-deep border border-line', className)}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={cx(
              'h-8 px-3 rounded-md text-[13px] transition-[background-color,color] duration-150 ease-out',
              active ? 'bg-raised2 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-fg2 hover:text-fg',
              disabled && !active && 'opacity-50',
              disabled && 'cursor-default',
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** Scoreboard plate, the signature element: painted figure on a dark board */
export function Tile({ children, className, tone = 'fg' }) {
  const tones = { fg: 'text-fg', accent: 'text-accent', muted: 'text-fg3', neg: 'text-neg', four: 'text-four' };
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center font-mono tabular-nums bg-deep border border-line rounded-md',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.4)]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Keycap({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[4px] bg-raised border border-line border-b-2 font-mono text-[11px] text-fg2">
      {children}
    </kbd>
  );
}

export function TeamDot({ team, className }) {
  const c = team === 'A' ? 'bg-teamA' : team === 'B' ? 'bg-teamB' : 'bg-fg3';
  return <span className={cx('inline-block w-2 h-2 rounded-full shrink-0', c, className)} />;
}

export function Avatar({ name = '?', size = 32, offline, className }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span
      className={cx(
        'relative inline-flex items-center justify-center rounded-full bg-raised2 text-fg2 font-medium shrink-0',
        offline && 'opacity-40',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function Spinner({ className }) {
  return <span className={cx('inline-block w-4 h-4 rounded-full border-2 border-fg3/40 border-t-fg2 animate-spin', className)} />;
}

export function Empty({ title, children }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-fg">{title}</p>
      {children && <p className="text-[13px] text-fg3 mt-1">{children}</p>}
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[13px] text-fg3">{label}</div>
      <div className="mt-1 text-[28px] leading-none font-medium tabular-nums text-fg">{value}</div>
      {sub && <div className="mt-2 text-xs text-fg3">{sub}</div>}
    </div>
  );
}
