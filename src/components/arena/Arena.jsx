import { useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import { useRoom } from '../../context/RoomContext.jsx';
import { useNow } from '../../hooks/useNow.js';
import { useBallEngine } from '../../hooks/useBallEngine.js';
import { COUNTDOWN_MS, REVEAL_MS, botActions, displayInnings, isBot, myTeam, oversStr } from '../../lib/engine.js';
import { gameTx } from '../../lib/rooms.js';
import { sfx } from '../../lib/sounds.js';
import { Card, TeamDot, cx } from '../ui.jsx';
import PlayerChip from '../players/PlayerChip.jsx';
import Scoreboard from './Scoreboard.jsx';
import RevealStage from './RevealStage.jsx';
import OverTracker from './OverTracker.jsx';
import HandPicker from './HandPicker.jsx';
import TossPanel from './TossPanel.jsx';
import SetupPanel from './SetupPanel.jsx';
import Commentary from './Commentary.jsx';
import H2HBanner from './H2HBanner.jsx';
import { ReactionBar, ReactionLayer } from './Reactions.jsx';

function useBallSounds(game, now) {
  const played = useRef(null);
  const lb = game.lastBall;
  useEffect(() => {
    if (!lb || played.current === `${game.startedAt}-${lb.seq}`) return;
    const t = now - lb.at;
    if (t > REVEAL_MS) {
      played.current = `${game.startedAt}-${lb.seq}`; // old ball (page load): stay quiet
      return;
    }
    if (t < COUNTDOWN_MS) return;
    played.current = `${game.startedAt}-${lb.seq}`;
    if (lb.out) {
      sfx.stumps();
      if (lb.duck) setTimeout(sfx.quack, 350);
    } else if (lb.runs >= 4) {
      sfx.bat();
      if (lb.runs === 6) setTimeout(sfx.crowd, 120);
    } else sfx.bat();
    if (lb.milestone) setTimeout(sfx.crowd, 400);
  }, [lb, now, game.startedAt]);
}

function Roster({ game, uid, inn }) {
  return (
    <div className="space-y-6">
      {[inn.bat, inn.bowl].map((t) => {
        const batting = t === inn.bat;
        const players = batting && inn.order ? [...inn.order, ...game.teams[t].players.filter((u) => !inn.order.includes(u))] : game.teams[t].players;
        return (
          <div key={t}>
            <div className="flex items-center gap-2 text-[13px] text-fg2 mb-1 px-2">
              <TeamDot team={t} /> {game.teams[t].name}
              <span className="ml-auto text-xs text-fg3">{batting ? 'Batting' : 'Bowling'}</span>
            </div>
            {players.map((u) => {
              const b = inn.batting[u];
              const w = inn.bowling[u];
              const atCrease = batting && inn.order?.[inn.bi] === u;
              const meta = batting
                ? b
                  ? `${b.runs}${b.out ? '' : '*'} (${b.balls})${b.out ? ' out' : atCrease ? ' batting' : ''}`
                  : atCrease
                    ? 'batting'
                    : 'yet to bat'
                : w
                  ? `${w.wkts}/${w.runs} (${oversStr(w.balls)})${inn.bowler === u ? ' bowling' : ''}`
                  : inn.bowler === u
                    ? 'bowling'
                    : '';
              return <PlayerChip key={u} uid={u} name={game.names[u]} me={uid} captain={game.teams[t].captain === u} bot={isBot(game, u)} meta={meta} dense />;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function Arena() {
  const { game, code, uid, myName, isHost, isAuthority } = useRoom();
  const now = useNow(150);
  const engine = useBallEngine({ code, game, uid, isAuthority, now });
  useBallSounds(game, now);

  const lb = game.lastBall;
  const revealing = lb && now - lb.at < REVEAL_MS;
  const counting = lb && now - lb.at < COUNTDOWN_MS;
  const secondsLeft = game.phase === 'ball' && !counting ? Math.max(0, Math.ceil(Math.min(10_000, game.deadline - now) / 1000)) : null;

  const tickRef = useRef(null);
  useEffect(() => {
    if (engine.role && !engine.myPick && secondsLeft != null && secondsLeft <= 3 && secondsLeft > 0 && tickRef.current !== secondsLeft) {
      tickRef.current = secondsLeft;
      sfx.tick();
    }
  }, [secondsLeft, engine.role, engine.myPick]);

  // Bot captains: toss calls, batting order and bowler changes (run by the room authority)
  const botStamp = useRef(null);
  useEffect(() => {
    if (!isAuthority || !game.bots?.length || (game.phase !== 'toss' && game.phase !== 'setup')) return undefined;
    const cur = game.innings[game.cur];
    const stamp = JSON.stringify([game.startedAt, game.phase, game.toss, game.cur, cur?.order, cur?.bowler, cur?.balls]);
    if (botStamp.current === stamp) return undefined;
    const t = setTimeout(() => {
      botStamp.current = stamp;
      gameTx(code, (g, now) => botActions(g, now));
    }, 900);
    return () => clearTimeout(t);
  }, [game, isAuthority, code]);

  if (game.phase === 'toss') {
    return (
      <div className="relative max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <ReactionLayer code={code} />
        <TossPanel code={code} game={game} uid={uid} isHost={isHost} />
        <div className="mt-6"><ReactionBar code={code} uid={uid} name={myName} /></div>
      </div>
    );
  }

  const { inn: shown } = displayInnings(game, now);
  const inn = game.innings[game.cur];
  const batterUid = engine.batter || inn.order?.[inn.bi];
  const curBat = inn.batting[batterUid];
  const curBowl = inn.bowling[inn.bowler];
  const team = myTeam(game, uid);
  const watching = !engine.role || game.phase !== 'ball';
  const overNo = Math.floor(shown.balls / 6) + 1;

  let watchText = '';
  if (game.phase === 'setup') watchText = '';
  else if (!team) watchText = 'You are spectating';
  else if (team === inn.bat) watchText = engine.role ? '' : `${game.teams[team].name} batting. Cheer from the dugout`;
  else watchText = engine.role ? '' : `${game.names[inn.bowler] || 'Your bowler'} is bowling this over`;

  return (
    <div className="relative max-w-[1100px] mx-auto px-4 md:px-8 py-6 md:py-8">
      <ReactionLayer code={code} />

      <Scoreboard game={game} shown={shown} />

      {(curBat || curBowl) && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-fg3">
          {batterUid && (
            <span>
              <span className="text-fg2">{game.names[batterUid]}</span>{' '}
              <span className="font-mono tabular-nums text-fg">
                {curBat ? `${curBat.runs}*` : '0*'}
              </span>{' '}
              <span className="font-mono tabular-nums">({curBat?.balls || 0})</span>
            </span>
          )}
          {inn.bowler && (
            <span>
              <span className="text-fg2">{game.names[inn.bowler]}</span>{' '}
              <span className="font-mono tabular-nums text-fg">{curBowl ? `${curBowl.wkts}/${curBowl.runs}` : '0/0'}</span>{' '}
              <span className="font-mono tabular-nums">({oversStr(curBowl?.balls || 0)})</span>
            </span>
          )}
        </div>
      )}

      <Card className="mt-6 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 h-6">
          <H2HBanner game={game} batter={engine.batter} bowler={engine.bowler} />
          {secondsLeft != null && (
            <span className={cx('ml-4 shrink-0 inline-flex items-center gap-1.5 font-mono tabular-nums text-[13px]', secondsLeft <= 3 ? 'text-neg' : 'text-fg2')}>
              <Timer size={16} strokeWidth={1.5} />
              {secondsLeft}s
            </span>
          )}
        </div>
        <RevealStage game={game} now={now} batter={engine.batter} bowler={engine.bowler} locked={engine.locked} />
        <div className="mt-4 pt-4 border-t border-line">
          <OverTracker balls={shown.over} overNo={overNo} />
        </div>
      </Card>

      <div className="mt-6">
        {game.phase === 'setup' ? (
          <SetupPanel key={`${game.cur}-${inn.balls}`} code={code} game={game} uid={uid} isHost={isHost} />
        ) : !watching ? (
          <HandPicker key={game.ballSeq} role={engine.role} disabled={!!counting} picked={engine.myPick} onPick={engine.pick} secondsLeft={secondsLeft} />
        ) : (
          watchText && <p className="text-[13px] text-fg3">{watchText}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <ReactionBar code={code} uid={uid} name={myName} />
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-6">
        <section>
          <h2 className="text-[13px] text-fg2 mb-2">Commentary</h2>
          <Commentary items={game.commentary} hideKey={counting ? lb.seq : null} />
        </section>
        <section>
          <h2 className="text-[13px] text-fg2 mb-2">Players</h2>
          <Roster game={game} uid={uid} inn={inn} />
        </section>
      </div>
    </div>
  );
}
