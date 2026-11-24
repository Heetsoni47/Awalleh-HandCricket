import { useState } from 'react';
import { gameTx } from '../../lib/rooms.js';
import { setBowler, setOrder } from '../../lib/engine.js';
import { Button, Card, cx } from '../ui.jsx';

/** Batting order (start of innings) and bowler for the next over, set by captains */
export default function SetupPanel({ code, game, uid, isHost }) {
  const inn = game.innings[game.cur];
  const { teams, names } = game;
  const batCap = teams[inn.bat].captain;
  const bowlCap = teams[inn.bowl].captain;
  const [order, setOrderLocal] = useState([]);
  const batPlayers = teams[inn.bat].players;
  const need = inn.super ? 1 : batPlayers.length;

  const toggle = (u) => setOrderLocal((o) => (o.includes(u) ? o.filter((x) => x !== u) : o.length < need ? [...o, u] : o));

  return (
    <div className="grid md:grid-cols-2 gap-4 animate-rise">
      <Card className="p-5">
        <h3 className="text-[15px] font-medium">{inn.super ? 'Super over batter' : 'Batting order'}</h3>
        <p className="mt-1 text-[13px] text-fg3">
          {teams[inn.bat].name}
          {inn.super ? ', one batter, one wicket' : ', tap players in the order they bat'}
        </p>
        {inn.order ? (
          <ol className="mt-4 space-y-1">
            {inn.order.map((u, i) => (
              <li key={u} className="flex items-center gap-3 h-9 text-sm">
                <span className="font-mono text-xs text-fg3 w-4">{i + 1}</span>
                {names[u]}
              </li>
            ))}
          </ol>
        ) : batCap === uid || isHost ? (
          <>
            <div className="mt-4 grid gap-1.5">
              {batPlayers.map((u) => {
                const pos = order.indexOf(u);
                return (
                  <button
                    key={u}
                    onClick={() => toggle(u)}
                    className={cx(
                      'h-11 px-3 rounded-lg border flex items-center gap-3 text-sm text-left transition-[background-color,border-color] duration-150',
                      pos >= 0 ? 'bg-raised2 border-line2' : 'bg-raised border-line hover:bg-raised2',
                    )}
                  >
                    <span className={cx('w-6 h-6 rounded-md grid place-items-center font-mono text-xs', pos >= 0 ? 'bg-accent text-accent-ink' : 'bg-deep text-fg3')}>
                      {pos >= 0 ? pos + 1 : ''}
                    </span>
                    {names[u]}
                  </button>
                );
              })}
            </div>
            <Button variant="primary" className="mt-4" disabled={order.length !== need} onClick={() => gameTx(code, (g, t) => setOrder(g, order, t))}>
              Confirm order
            </Button>
          </>
        ) : (
          <p className="mt-4 text-[13px] text-fg3">Waiting for {names[batCap]} to set the order</p>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-[15px] font-medium">Bowler for over {Math.floor(inn.balls / 6) + 1}</h3>
        <p className="mt-1 text-[13px] text-fg3">
          {teams[inn.bowl].name}
          {teams[inn.bowl].players.length > 1 ? ', nobody bowls two overs in a row' : ''}
        </p>
        {inn.bowler ? (
          <p className="mt-4 text-sm">{names[inn.bowler]}</p>
        ) : bowlCap === uid || isHost ? (
          <div className="mt-4 grid gap-1.5">
            {teams[inn.bowl].players.map((u) => {
              const blocked = teams[inn.bowl].players.length > 1 && u === inn.lastBowler;
              const fig = inn.bowling[u];
              return (
                <button
                  key={u}
                  disabled={blocked}
                  onClick={() => gameTx(code, (g, t) => setBowler(g, u, t))}
                  className="h-11 px-3 rounded-lg border border-line bg-raised hover:bg-raised2 flex items-center gap-3 text-sm text-left transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {names[u]}
                  <span className="ml-auto font-mono text-xs text-fg3">
                    {blocked ? 'just bowled' : fig ? `${fig.wkts}/${fig.runs}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-fg3">Waiting for {names[bowlCap]} to pick a bowler</p>
        )}
      </Card>
    </div>
  );
}
