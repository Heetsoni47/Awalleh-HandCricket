import { useEffect, useState } from 'react';
import { startMusic } from '../lib/music.js';
import { APP_NAME } from '../appInfo.js';
import { cx } from './ui.jsx';

// An over plays out on scoreboard chips, then the name rises in.
const OVER = [1, 4, 6, 'W', 2, 6];
const chip = (x) =>
  x === 'W'
    ? 'bg-neg/15 border-neg/40 text-neg'
    : x === 6
      ? 'bg-accent/15 border-accent/40 text-accent'
      : x === 4
        ? 'bg-four/15 border-four/40 text-four'
        : 'bg-card border-line text-fg';

export default function Intro({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  function enter() {
    startMusic(); // the tap unlocks audio in the browser
    setLeaving(true);
    setTimeout(onDone, 320);
  }

  useEffect(() => {
    const f = (e) => (e.key === 'Enter' || e.key === ' ') && enter();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cx(
        'fixed inset-0 z-[100] bg-deep flex items-center justify-center px-6 transition-opacity duration-300 ease-out',
        leaving ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div className="w-full max-w-[640px] flex flex-col items-center text-center">
        <div className="flex gap-2">
          {OVER.map((x, i) => (
            <span
              key={i}
              className={cx('w-10 h-10 md:w-12 md:h-12 grid place-items-center rounded-lg border font-mono text-[15px] md:text-lg tabular-nums animate-pop', chip(x))}
              style={{ animationDelay: `${150 + i * 140}ms` }}
            >
              {x}
            </span>
          ))}
        </div>

        <h1
          className="mt-10 text-[40px] md:text-[64px] leading-[1.04] font-medium tracking-[-0.03em] text-fg animate-rise"
          style={{ animationDelay: '1050ms' }}
        >
          {APP_NAME}
        </h1>
        <p className="mt-4 text-[15px] md:text-[18px] text-fg2 animate-rise" style={{ animationDelay: '1300ms' }}>
          Hand cricket with your friends, 1v1 to 5v5
        </p>

        <button
          onClick={enter}
          className="mt-10 h-12 px-8 rounded-[10px] bg-fg text-deep text-[15px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] animate-rise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep"
          style={{ animationDelay: '1650ms' }}
          autoFocus
        >
          Enter
        </button>
      </div>
    </div>
  );
}
