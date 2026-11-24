import { Check, Loader2 } from 'lucide-react';
import { COUNTDOWN_MS, REVEAL_MS } from '../../lib/engine.js';
import { Tile, cx } from '../ui.jsx';
import FingerPips from './FingerPips.jsx';

function Plate({ role, name, value, state, out }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center">
      <div className="text-xs text-fg3">{role}</div>
      <div className="mt-1 text-sm text-fg truncate max-w-full">{name || '–'}</div>
      <Tile
        tone={out ? 'neg' : 'fg'}
        className={cx(
          'mt-3 w-full max-w-[200px] h-28 md:h-44 rounded-2xl text-[56px] md:text-[88px] leading-none font-medium transition-colors duration-200',
          out && 'border-neg/40',
        )}
      >
        {state === 'show' ? (
          <span key={value} className="animate-pop">{value}</span>
        ) : state === 'locked' ? (
          <Check size={32} strokeWidth={1.5} className="text-pos" />
        ) : state === 'hidden' ? (
          <span className="text-fg3">?</span>
        ) : (
          <Loader2 size={28} strokeWidth={1.5} className="text-fg3 animate-spin" />
        )}
      </Tile>
      <div className="mt-2 h-4 flex items-center gap-2 text-xs text-fg3">
        {state === 'show' ? <FingerPips n={value} /> : state === 'locked' ? 'Locked in' : state === 'thinking' ? 'Choosing' : ''}
      </div>
    </div>
  );
}

/**
 * Shows the 3-2-1 countdown then both hands for REVEAL_MS after a ball resolves,
 * otherwise the lock-in status of the current ball.
 */
export default function RevealStage({ game, now, batter, bowler, locked }) {
  const lb = game.lastBall;
  const t = lb ? now - lb.at : Infinity;
  const revealing = t < REVEAL_MS;
  const names = game.names;

  if (revealing) {
    const counting = t < COUNTDOWN_MS;
    const n = 3 - Math.floor(t / (COUNTDOWN_MS / 3));
    const verdict = lb.out ? 'Out' : `${lb.runs} run${lb.runs === 1 ? '' : 's'}`;
    const tone = lb.out ? 'text-neg' : lb.runs === 6 ? 'text-accent' : lb.runs === 4 ? 'text-four' : 'text-fg';
    return (
      <div>
        <div className="flex items-start gap-4 md:gap-8">
          <Plate role="Batter" name={names[lb.batter]} value={lb.bat} state={counting ? 'hidden' : 'show'} out={!counting && lb.out} />
          <div className="self-center pt-6 w-16 text-center">
            {counting ? (
              <span key={n} className="block font-mono text-[40px] text-fg2 animate-pop">{n}</span>
            ) : (
              <span className="block text-[13px] text-fg3">vs</span>
            )}
          </div>
          <Plate role="Bowler" name={names[lb.bowler]} value={lb.bowl} state={counting ? 'hidden' : 'show'} out={!counting && lb.out} />
        </div>
        <div className="mt-3 h-8 text-center">
          {!counting && (
            <span className={cx('text-[22px] font-medium animate-pop inline-block', tone)}>
              {lb.out && lb.golden ? 'Out, golden duck' : verdict}
            </span>
          )}
          {counting && <span className="text-[13px] text-fg3">Show</span>}
        </div>
      </div>
    );
  }

  const st = (who) => (locked[who] ? 'locked' : 'thinking');
  return (
    <div>
      <div className="flex items-start gap-4 md:gap-8">
        <Plate role="Batter" name={names[batter]} state={batter ? st('bat') : 'hidden'} />
        <div className="self-center pt-6 w-16 text-center text-[13px] text-fg3">vs</div>
        <Plate role="Bowler" name={names[bowler]} state={bowler ? st('bowl') : 'hidden'} />
      </div>
      <div className="mt-3 h-8" />
    </div>
  );
}
