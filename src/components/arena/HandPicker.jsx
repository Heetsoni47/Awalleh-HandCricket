import { useEffect } from 'react';
import { Keycap, cx } from '../ui.jsx';
import FingerPips from './FingerPips.jsx';

/** Big tactile 1–6 buttons. Keys 1–6 work too. */
export default function HandPicker({ role, disabled, picked, onPick, secondsLeft }) {
  useEffect(() => {
    const f = (e) => {
      if (disabled || picked) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 6) onPick(n);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [disabled, picked, onPick]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-fg2">
          {picked ? (
            <>You locked in <span className="font-mono text-fg">{picked.pick}</span>{picked.auto ? ', picked by the shot clock' : ''}</>
          ) : role === 'bat' ? (
            'You are batting. Pick your shot'
          ) : (
            'You are bowling. Pick your delivery'
          )}
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-xs text-fg3">
          Keys <Keycap>1</Keycap>–<Keycap>6</Keycap>
        </span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const chosen = picked?.pick === n;
          return (
            <button
              key={n}
              disabled={disabled || !!picked}
              onClick={() => onPick(n)}
              className={cx(
                'h-[84px] md:h-24 rounded-xl border flex flex-col items-center justify-center gap-2 select-none',
                'transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97]',
                chosen
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-raised border-line text-fg hover:bg-raised2 hover:border-line2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                (disabled || picked) && !chosen && 'opacity-40',
              )}
            >
              <span className="font-mono text-[32px] leading-none font-medium">{n}</span>
              <FingerPips n={n} active={chosen} className={chosen ? 'text-accent-ink' : ''} />
            </button>
          );
        })}
      </div>
      {secondsLeft != null && !picked && (
        <div className="mt-3 h-1 rounded-full bg-deep overflow-hidden">
          <div
            className={cx('h-full rounded-full transition-[width] duration-200 ease-linear', secondsLeft <= 3 ? 'bg-neg' : 'bg-fg3')}
            style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / 10) * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
