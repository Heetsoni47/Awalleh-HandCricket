import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { listPlayers } from '../../lib/matchSave.js';
import { emptyStats, fmt1, best, hs } from '../../lib/stats.js';
import { Avatar, Card, Empty, Seg, Spinner, cx } from '../ui.jsx';

const BOARDS = {
  runs: {
    label: 'Orange cap',
    blurb: 'Most runs',
    filter: (s) => s.bInn > 0,
    sort: (a, b) => b.runs - a.runs || (b.sr || 0) - (a.sr || 0),
    main: (s) => s.runs,
    cols: [
      ['Inns', (s) => s.bInn],
      ['Avg', (s) => fmt1(s.avg)],
      ['SR', (s) => fmt1(s.sr)],
      ['HS', (s) => hs(s)],
    ],
  },
  wkts: {
    label: 'Purple cap',
    blurb: 'Most wickets',
    filter: (s) => s.wInn > 0,
    sort: (a, b) => b.wkts - a.wkts || (a.econ || 99) - (b.econ || 99),
    main: (s) => s.wkts,
    cols: [
      ['Inns', (s) => s.wInn],
      ['Econ', (s) => fmt1(s.econ)],
      ['Avg', (s) => fmt1(s.bowlAvg)],
      ['Best', (s) => best(s)],
    ],
  },
  sr: {
    label: 'Strike rate',
    blurb: 'Highest strike rate, 30 balls or more',
    filter: (s) => s.balls >= 30,
    sort: (a, b) => (b.sr || 0) - (a.sr || 0),
    main: (s) => fmt1(s.sr),
    cols: [
      ['Runs', (s) => s.runs],
      ['Balls', (s) => s.balls],
      ['6s', (s) => s.sixes],
      ['4s', (s) => s.fours],
    ],
  },
  ducks: {
    label: 'Hall of shame',
    blurb: 'Most ducks',
    filter: (s) => s.ducks > 0,
    sort: (a, b) => b.ducks - a.ducks || b.goldenDucks - a.goldenDucks,
    main: (s) => s.ducks,
    cols: [
      ['Golden', (s) => s.goldenDucks],
      ['Diamond', (s) => s.diamondDucks],
      ['Inns', (s) => s.bInn],
      ['Runs', (s) => s.runs],
    ],
  },
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [players, setPlayers] = useState(null);
  const [tab, setTab] = useState('runs');
  const [error, setError] = useState('');

  useEffect(() => {
    listPlayers()
      .then(setPlayers)
      .catch((e) => {
        setError(e.message);
        setPlayers([]);
      });
  }, []);

  const board = BOARDS[tab];
  const rows = useMemo(() => {
    if (!players) return [];
    return players
      .map((p) => ({ ...p, s: { ...emptyStats(), ...(p.stats || {}) } }))
      .filter((p) => board.filter(p.s))
      .sort((a, b) => board.sort(a.s, b.s))
      .slice(0, 50);
  }, [players, board]);

  return (
    <div className="animate-rise">
      <h1 className="text-[28px] md:text-[32px] leading-[1.15] font-medium">Leaderboard</h1>
      <p className="mt-1 text-sm text-fg2">{board.blurb}</p>
      <div className="mt-6 overflow-x-auto -mx-4 px-4">
        <Seg value={tab} onChange={setTab} options={Object.entries(BOARDS).map(([value, b]) => ({ value, label: b.label }))} />
      </div>
      <Card className="mt-6 overflow-hidden">
        {players === null ? (
          <div className="h-32 grid place-items-center"><Spinner /></div>
        ) : rows.length === 0 ? (
          <Empty title="No qualifying players yet">{error || 'Play a few matches to get on the board'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line text-xs text-fg3">
                  <th className="w-14 py-3 pl-5 text-left font-normal">#</th>
                  <th className="py-3 text-left font-normal">Player</th>
                  {board.cols.map(([k]) => (
                    <th key={k} className="py-3 text-right font-normal w-20">{k}</th>
                  ))}
                  <th className="py-3 pr-5 text-right font-normal w-24">{board.label}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.uid} className={cx('border-b border-line last:border-0', p.uid === user.uid && 'bg-raised/40')}>
                    <td className="py-3 pl-5 font-mono tabular-nums text-[13px] text-fg3">{i + 1}</td>
                    <td className="py-3">
                      <Link to={`/profile/${p.uid}`} className="inline-flex items-center gap-3 text-sm hover:text-accent transition-colors duration-150">
                        <Avatar name={p.username} size={28} />
                        {p.username}
                      </Link>
                    </td>
                    {board.cols.map(([k, f]) => (
                      <td key={k} className="py-3 text-right font-mono tabular-nums text-[13px] text-fg2">{f(p.s)}</td>
                    ))}
                    <td className={cx('py-3 pr-5 text-right font-mono tabular-nums text-[15px]', i === 0 ? 'text-accent' : 'text-fg')}>
                      {board.main(p.s)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
