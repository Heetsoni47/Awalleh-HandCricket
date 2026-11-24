import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { Award, Lock } from 'lucide-react';
import { db } from '../../firebaseConfig.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMatchesFor } from '../../lib/matchSave.js';
import { BADGES, emptyStats, fmt1, fmtInt, hs, best, overs } from '../../lib/stats.js';
import { Avatar, Card, Empty, SectionLabel, Spinner, cx } from '../ui.jsx';
import MatchRow from '../history/MatchRow.jsx';

function StatGrid({ rows }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="px-5 py-4 border-b border-r border-line [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0">
          <dt className="text-xs text-fg3">{k}</dt>
          <dd className="mt-1 font-mono tabular-nums text-[17px] text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Block({ title, rows }) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <Card className="overflow-hidden">
        <StatGrid rows={rows} />
      </Card>
    </section>
  );
}

export default function ProfilePage() {
  const { uid } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(undefined);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    setP(undefined);
    const off = onSnapshot(
      doc(db, 'users', uid),
      (s) => setP(s.exists() ? { uid, ...s.data() } : null),
      () => setP(null),
    );
    listMatchesFor(uid, 10).then(setMatches).catch(() => setMatches([]));
    return off;
  }, [uid]);

  if (p === undefined) return <div className="h-40 grid place-items-center"><Spinner /></div>;
  if (!p) return <Empty title="Player not found" />;

  const s = { ...emptyStats(), ...(p.stats || {}) };
  const joined = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null;
  const earned = p.badges || {};

  const general = [
    ['Matches', fmtInt(s.matches)],
    ['Won', fmtInt(s.wins)],
    ['Lost', fmtInt(s.losses)],
    ['Tied', fmtInt(s.ties)],
    ['Win %', s.winPct === null ? '–' : `${s.winPct.toFixed(1)}`],
    ['Player of the match', fmtInt(s.mom)],
    ['Player of the series', fmtInt(s.mos)],
  ];
  const batting = [
    ['Innings', fmtInt(s.bInn)],
    ['Runs', fmtInt(s.runs)],
    ['Not outs', fmtInt(s.notOuts)],
    ['Average', fmt1(s.avg)],
    ['Strike rate', fmt1(s.sr)],
    ['Highest score', hs(s)],
    ['Balls faced', fmtInt(s.balls)],
    ['4s', fmtInt(s.fours)],
    ['6s', fmtInt(s.sixes)],
    ['30s', fmtInt(s.thirties)],
    ['50s', fmtInt(s.fifties)],
    ['100s', fmtInt(s.hundreds)],
    ['Ducks', fmtInt(s.ducks)],
    ['Golden ducks', fmtInt(s.goldenDucks)],
    ['Diamond ducks', fmtInt(s.diamondDucks)],
    ['Dot balls faced', fmtInt(s.dotsFaced)],
  ];
  const bowling = [
    ['Innings', fmtInt(s.wInn)],
    ['Overs', overs(s.wBalls)],
    ['Balls', fmtInt(s.wBalls)],
    ['Runs conceded', fmtInt(s.wRuns)],
    ['Wickets', fmtInt(s.wkts)],
    ['Average', fmt1(s.bowlAvg)],
    ['Economy', fmt1(s.econ)],
    ['Strike rate', fmt1(s.bowlSr)],
    ['Best figures', best(s)],
    ['Maidens', fmtInt(s.maidens)],
    ['3-wicket hauls', fmtInt(s.threeW)],
    ['5-wicket hauls', fmtInt(s.fiveW)],
    ['Dot balls', fmtInt(s.wDots)],
  ];

  return (
    <div className="animate-rise">
      <div className="flex items-center gap-5">
        <Avatar name={p.username} size={64} />
        <div>
          <h1 className="text-[28px] md:text-[32px] leading-[1.15] font-medium">{p.username}</h1>
          <p className="mt-1 text-[13px] text-fg3">
            {uid === user.uid ? 'Your career' : 'Career record'}
            {joined ? ` · Playing since ${joined}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-line bg-hair">
        {[
          ['Runs', fmtInt(s.runs), `Average ${fmt1(s.avg)}`],
          ['Wickets', fmtInt(s.wkts), `Best ${best(s)}`],
          ['Highest score', hs(s), `Strike rate ${fmt1(s.sr)}`],
          ['Matches', fmtInt(s.matches), s.winPct === null ? 'No results yet' : `${s.winPct.toFixed(0)}% won`],
        ].map(([k, v, sub]) => (
          <div key={k} className="bg-card p-5">
            <div className="text-[13px] text-fg3">{k}</div>
            <div className="mt-2 font-mono tabular-nums text-[32px] leading-none text-fg">{v}</div>
            <div className="mt-2 text-xs text-fg3">{sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-x-6 gap-y-10">
        <div className="space-y-10">
          <Block title="Batting" rows={batting} />
        </div>
        <div className="space-y-10">
          <Block title="Bowling" rows={bowling} />
          <Block title="Results" rows={general} />
        </div>
      </div>

      <section className="mt-10">
        <SectionLabel right={<span className="font-mono text-xs text-fg3">{Object.keys(earned).length}/{Object.keys(BADGES).length}</span>}>
          Achievements
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(BADGES).map(([id, b]) => {
            const got = earned[id];
            return (
              <Card key={id} className={cx('p-4', !got && 'bg-deep')}>
                <div className="flex items-center gap-2">
                  {got ? <Award size={16} strokeWidth={1.5} className="text-accent" /> : <Lock size={16} strokeWidth={1.5} className="text-fg3" />}
                  <span className={cx('text-[13px] font-medium', got ? 'text-fg' : 'text-fg3')}>{b.name}</span>
                </div>
                <p className="mt-2 text-xs text-fg3 leading-4">{b.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel>Recent matches</SectionLabel>
        <Card className="divide-y divide-line">
          {matches === null ? (
            <div className="h-20" />
          ) : matches.length === 0 ? (
            <Empty title="No matches yet" />
          ) : (
            matches.map((m) => <MatchRow key={m.id} m={m} me={uid} />)
          )}
        </Card>
      </section>
    </div>
  );
}
