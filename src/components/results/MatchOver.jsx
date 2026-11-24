import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowRight, RotateCcw, Users } from 'lucide-react';
import { useRoom } from '../../context/RoomContext.jsx';
import { backToLobby, startMatch } from '../../lib/rooms.js';
import { seriesLine } from '../../lib/engine.js';
import { BADGES, detectBadges } from '../../lib/stats.js';
import { sfx } from '../../lib/sounds.js';
import { Button, Card, TeamDot, Tile, cx } from '../ui.jsx';
import Scorecard from './Scorecard.jsx';

function figures(game, uid) {
  let runs = 0, balls = 0, batted = false, notOut = false, wkts = 0, conceded = 0, bowled = 0;
  game.innings.forEach((inn) => {
    const b = inn.batting[uid];
    if (b) {
      batted = true;
      runs += b.runs;
      balls += b.balls;
      notOut = !b.out;
    }
    const w = inn.bowling[uid];
    if (w) {
      wkts += w.wkts;
      conceded += w.runs;
      bowled += w.balls;
    }
  });
  const parts = [];
  if (batted) parts.push(`${runs}${notOut ? '*' : ''} (${balls})`);
  if (bowled) parts.push(`${wkts}/${conceded}`);
  return parts.join(' and ') || 'Did not feature';
}

export default function MatchOver() {
  const { game, code, room, isHost, uid } = useRoom();
  const [busy, setBusy] = useState(false);
  const len = Number(game.settings.series) || 1;
  const series = seriesLine(game);
  const badges = useMemo(() => detectBadges(game), [game]);
  const ranking = Object.entries(game.mvp || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

  useEffect(() => {
    sfx.crowd();
  }, []);

  async function next(fresh) {
    setBusy(true);
    try {
      await startMatch(code, room, fresh ? null : game);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="animate-rise">
        <div className="text-[13px] text-fg3">
          Match {game.matchNo}
          {len > 1 ? ` of ${len}` : ''}
        </div>
        <h1 className="mt-2 text-[32px] md:text-[44px] leading-[1.08] font-medium tracking-[-0.02em]">{game.result?.text}</h1>
        {series && <p className="mt-2 text-[15px] text-fg2">{series}</p>}
        {game.bots?.length > 0 && <p className="mt-2 text-[13px] text-fg3">Practice match with bots. It shows in match history but doesn't change careers or leaderboards</p>}
      </div>

      {len > 1 && (
        <Card className="mt-8 p-5 flex flex-wrap items-center gap-6 animate-rise">
          {['A', 'B'].map((t, i) => (
            <div key={t} className={cx('flex items-center gap-3', i === 1 && 'sm:flex-row-reverse sm:text-right')}>
              <TeamDot team={t} />
              <span className="text-sm">{game.teams[t].name}</span>
              <Tile tone={game.seriesWinner === t ? 'accent' : 'fg'} className="w-12 h-14 text-[28px] rounded-lg">
                {game.series[t]}
              </Tile>
            </div>
          ))}
          <div className="flex gap-1.5 sm:ml-auto">
            {Array.from({ length: len }, (_, i) => {
              const r = game.series.results[i];
              return (
                <span
                  key={i}
                  title={r ? (r === 'T' ? 'Tie' : game.teams[r].name) : 'To play'}
                  className={cx(
                    'w-7 h-7 rounded-md border grid place-items-center font-mono text-[11px]',
                    !r ? 'border-dashed border-line text-fg3/50' : 'border-line bg-deep',
                    r === 'A' && 'text-teamA',
                    r === 'B' && 'text-teamB',
                    r === 'T' && 'text-fg3',
                  )}
                >
                  {r ? (r === 'T' ? 'T' : r) : i + 1}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-6 grid md:grid-cols-[1.2fr_1fr] gap-4">
        <Card className="p-6 md:p-8 animate-rise">
          <div className="text-[13px] text-fg3">Player of the match</div>
          <Link to={String(game.mom).startsWith('bot_') ? '#' : `/profile/${game.mom}`} className="mt-2 block text-[32px] leading-tight font-medium hover:text-accent transition-colors">
            {game.names[game.mom]}
          </Link>
          <div className="mt-1 text-sm text-fg2 font-mono tabular-nums">{figures(game, game.mom)}</div>
          <div className="mt-8 flex items-end gap-3">
            <Tile tone="accent" className="h-16 px-4 text-[40px] rounded-xl">{game.mvp?.[game.mom] ?? 0}</Tile>
            <span className="pb-2 text-[13px] text-fg3">MVP points</span>
          </div>
          {game.seriesDone && game.mos && (
            <div className="mt-8 pt-6 border-t border-line">
              <div className="text-[13px] text-fg3">Player of the series</div>
              <div className="mt-1 text-[20px] font-medium">{game.names[game.mos]}</div>
              <div className="text-xs text-fg3 font-mono">{game.series.mvp?.[game.mos] ?? 0} points across the series</div>
            </div>
          )}
        </Card>

        <Card className="p-6 animate-rise">
          <div className="text-[13px] text-fg3">Top performers</div>
          <ol className="mt-4 space-y-3">
            {ranking.map(([u, pts], i) => (
              <li key={u} className="flex items-center gap-3">
                <span className="font-mono text-xs text-fg3 w-4">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">{game.names[u]}</span>
                  <span className="block text-xs text-fg3 font-mono tabular-nums">{figures(game, u)}</span>
                </span>
                <span className="font-mono tabular-nums text-sm text-fg2">{pts}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-fg3 leading-4">1 point per run, 20 per wicket, 10 per maiden, bonuses for 30s, 50s, 100s and 3 or 5 wicket hauls</p>
        </Card>
      </div>

      {Object.keys(badges).length > 0 && (
        <section className="mt-8">
          <h2 className="text-[13px] text-fg2 mb-3">Achievements unlocked</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(badges).flatMap(([u, ids]) =>
              ids
                .filter((id) => id !== 'firstWin')
                .map((id) => (
                  <span key={`${u}-${id}`} className="h-9 px-3 rounded-lg bg-card border border-line inline-flex items-center gap-2 text-[13px]">
                    <Award size={16} strokeWidth={1.5} className="text-accent" />
                    <span className="text-fg">{BADGES[id].name}</span>
                    <span className="text-fg3">{game.names[u]}</span>
                  </span>
                )),
            )}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {isHost ? (
          <>
            {!game.seriesDone ? (
              <Button variant="accent" size="lg" disabled={busy} onClick={() => next(false)}>
                Match {game.matchNo + 1} <ArrowRight size={18} strokeWidth={1.5} />
              </Button>
            ) : (
              <Button variant="accent" size="lg" disabled={busy} onClick={() => next(true)}>
                <RotateCcw size={18} strokeWidth={1.5} /> {len > 1 ? 'New series' : 'Rematch'}
              </Button>
            )}
            <Button size="lg" onClick={() => backToLobby(code)}>
              <Users size={18} strokeWidth={1.5} /> Back to lobby
            </Button>
          </>
        ) : (
          <p className="text-[13px] text-fg3">
            {game.bots?.length
              ? 'Practice match with bots, careers unchanged. '
              : [...game.teams.A.players, ...game.teams.B.players].includes(uid)
                ? 'Stats saved to your career. '
                : ''}
            Waiting for the host
          </p>
        )}
      </div>

      <section className="mt-12">
        <h2 className="text-[13px] text-fg2 mb-3">Scorecard</h2>
        <Scorecard innings={game.innings} names={game.names} teams={game.teams} />
      </section>
    </div>
  );
}
