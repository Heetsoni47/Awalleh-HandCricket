import { oversStr, seriesLine, situation } from '../../lib/engine.js';
import { TeamDot, cx } from '../ui.jsx';

export default function Scoreboard({ game, shown }) {
  const sit = situation(game);
  if (!sit) return null;
  const inn = shown; // innings with the latest ball hidden during the countdown
  const { teams } = game;
  const crr = inn.balls ? ((inn.runs / inn.balls) * 6).toFixed(2) : '0.00';
  const main = game.innings.filter((i) => !i.super && i !== game.innings[game.cur]);
  const others = main.map((i) => ({ team: i.bat, text: `${i.runs}/${i.wkts}` }));
  const series = seriesLine(game);
  const eq = sit.equation && {
    ...sit.equation,
    need: Math.max(0, sit.equation.target - inn.runs),
    balls: inn.maxBalls - inn.balls,
  };
  const lead = sit.lead && {
    ...sit.lead,
    diff: sit.lead.diff - (game.innings[game.cur].runs - inn.runs),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="inline-flex items-center gap-2 text-fg">
          <TeamDot team={inn.bat} />
          {teams[inn.bat].name}
        </span>
        <span className="text-fg3">{sit.label}</span>
        {series && <span className="ml-auto text-fg3">{series}</span>}
      </div>

      <div className="mt-3 flex items-end gap-4 flex-wrap">
        <div className="font-mono tabular-nums leading-none text-[56px] md:text-[72px] font-medium tracking-[-0.03em] text-fg">
          {inn.runs}
          <span className="text-fg3">/</span>
          {inn.wkts}
        </div>
        <div className="pb-2 font-mono tabular-nums text-[13px] text-fg2 space-y-1">
          <div>
            {oversStr(inn.balls)} <span className="text-fg3">/ {inn.maxBalls / 6} ov</span>
          </div>
          <div className="text-fg3">CRR {crr}</div>
        </div>
        {others.length > 0 && (
          <div className="pb-2 ml-auto text-right text-[13px] space-y-1">
            {others.map((o, i) => (
              <div key={i} className="flex items-center justify-end gap-2 text-fg3">
                <TeamDot team={o.team} />
                {teams[o.team].name}
                <span className="font-mono tabular-nums text-fg2">{o.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {eq && (
        <div className="mt-4 h-10 px-4 rounded-lg bg-deep border border-line flex items-center gap-3 text-[13px]">
          <span className="text-fg2">
            Need <span className="font-mono tabular-nums text-accent">{eq.need}</span> run{eq.need === 1 ? '' : 's'} off{' '}
            <span className="font-mono tabular-nums text-fg">{eq.balls}</span> ball{eq.balls === 1 ? '' : 's'}
          </span>
          <span className="text-fg3">·</span>
          <span className="text-fg3">
            RRR <span className="font-mono tabular-nums text-fg2">{eq.balls ? ((eq.need / eq.balls) * 6).toFixed(2) : '–'}</span>
          </span>
          <span className="ml-auto text-fg3 hidden sm:inline">
            Target <span className="font-mono tabular-nums text-fg2">{eq.target}</span>
          </span>
        </div>
      )}
      {lead && (
        <div className="mt-4 h-10 px-4 rounded-lg bg-deep border border-line flex items-center text-[13px] text-fg2">
          {teams[lead.team].name}{' '}
          {lead.diff === 0 ? (
            'level on runs'
          ) : (
            <>
              &nbsp;{lead.diff > 0 ? 'lead' : 'trail'} by&nbsp;
              <span className={cx('font-mono tabular-nums', lead.diff > 0 ? 'text-pos' : 'text-neg')}>{Math.abs(lead.diff)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
