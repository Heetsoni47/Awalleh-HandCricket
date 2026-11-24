import { useEffect, useState } from 'react';
import { Swords } from 'lucide-react';
import { getH2H } from '../../lib/matchSave.js';

/** Career + this-match record for the current batter vs bowler */
export default function H2HBanner({ game, batter, bowler }) {
  const [career, setCareer] = useState(null);
  useEffect(() => {
    setCareer(null);
    if (batter && bowler) getH2H(batter, bowler).then(setCareer);
  }, [batter, bowler]);
  if (!batter || !bowler) return null;

  let runs = career?.runs || 0;
  let balls = career?.balls || 0;
  let outs = career?.outs || 0;
  game.innings
    .filter((i) => !i.super)
    .forEach((inn) =>
      inn.log.forEach((x) => {
        if (x.bt === batter && x.bw === bowler) {
          runs += x.r;
          balls += 1;
          outs += x.o;
        }
      }),
    );

  return (
    <div className="flex items-center gap-3 text-[13px] text-fg2 min-w-0">
      <Swords size={16} strokeWidth={1.5} className="text-fg3 shrink-0" />
      <span className="truncate">
        <span className="text-fg">{game.names[batter]}</span> vs <span className="text-fg">{game.names[bowler]}</span>
        {balls === 0 ? (
          <span className="text-fg3"> · first meeting</span>
        ) : (
          <span className="text-fg3">
            {' · '}
            <span className="font-mono tabular-nums text-fg2">{runs}</span> runs,{' '}
            <span className="font-mono tabular-nums text-fg2">{outs}</span> dismissal{outs === 1 ? '' : 's'} in{' '}
            <span className="font-mono tabular-nums text-fg2">{balls}</span> balls
          </span>
        )}
      </span>
    </div>
  );
}
