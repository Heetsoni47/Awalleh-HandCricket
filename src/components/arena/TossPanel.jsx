import { gameTx } from '../../lib/rooms.js';
import { tossCall, tossDecide, tossThrow } from '../../lib/engine.js';
import { Button, Card, TeamDot, Tile } from '../ui.jsx';
import FingerPips from './FingerPips.jsx';

/** Odd/even toss between the two captains (host can stand in for an absent captain) */
export default function TossPanel({ code, game, uid, isHost }) {
  const { toss, teams } = game;
  const capOf = (t) => teams[t].captain;
  const canAct = (t) => capOf(t) === uid || isHost;
  const name = (t) => teams[t].name;
  const act = (fn) => gameTx(code, fn);

  const revealed = toss.throws.A && toss.throws.B;

  return (
    <Card className="p-6 md:p-8 animate-rise">
      <h2 className="text-[22px] font-medium">Toss</h2>
      <p className="mt-1 text-sm text-fg2">Odd or even. Both captains throw a number and the sum decides it</p>

      {!toss.call && (
        <div className="mt-6">
          {canAct('A') ? (
            <>
              <p className="text-[13px] text-fg2 mb-3">{name('A')}, call it</p>
              <div className="flex gap-2">
                <Button size="lg" variant="primary" onClick={() => act((g) => tossCall(g, 'odd'))}>Odd</Button>
                <Button size="lg" onClick={() => act((g) => tossCall(g, 'even'))}>Even</Button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-fg3">Waiting for {game.names[capOf('A')]} to call odd or even</p>
          )}
        </div>
      )}

      {toss.call && (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {['A', 'B'].map((t) => {
            const call = t === 'A' ? toss.call : toss.call === 'odd' ? 'even' : 'odd';
            const thrown = toss.throws[t];
            return (
              <div key={t} className="rounded-xl border border-line bg-deep p-4">
                <div className="flex items-center gap-2 text-sm">
                  <TeamDot team={t} /> {name(t)}
                  <span className="ml-auto text-[13px] text-fg3 capitalize">{call}</span>
                </div>
                <div className="mt-4">
                  {revealed ? (
                    <Tile className="w-16 h-20 text-[40px] rounded-xl">{thrown}</Tile>
                  ) : thrown ? (
                    <p className="text-[13px] text-pos h-20 flex items-center">Thrown</p>
                  ) : canAct(t) ? (
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => act((g) => tossThrow(g, t, n))}
                          className="h-20 rounded-lg bg-raised border border-line hover:bg-raised2 flex flex-col items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.97]"
                        >
                          <span className="font-mono text-xl">{n}</span>
                          <FingerPips n={n} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-fg3 h-20 flex items-center">{game.names[capOf(t)]} is throwing</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toss.winner && (
        <div className="mt-6 animate-rise">
          <p className="text-sm text-fg">
            <span className="font-mono">{toss.throws.A} + {toss.throws.B} = {toss.sum}</span>
            <span className="text-fg3"> · </span>
            {name(toss.winner)} win the toss
          </p>
          {canAct(toss.winner) ? (
            <div className="mt-4 flex gap-2">
              <Button size="lg" variant="accent" onClick={() => act((g, t) => tossDecide(g, 'bat', t))}>Bat first</Button>
              <Button size="lg" onClick={() => act((g, t) => tossDecide(g, 'bowl', t))}>Bowl first</Button>
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-fg3">Waiting for {game.names[capOf(toss.winner)]} to choose</p>
          )}
        </div>
      )}
    </Card>
  );
}
