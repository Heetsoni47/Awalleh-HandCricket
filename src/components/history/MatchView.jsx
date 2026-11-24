import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getMatch } from '../../lib/matchSave.js';
import { Card, Empty, Spinner } from '../ui.jsx';
import Scorecard from '../results/Scorecard.jsx';

export default function MatchView() {
  const { id } = useParams();
  const [m, setM] = useState(undefined);
  useEffect(() => {
    getMatch(id).then(setM).catch(() => setM(null));
  }, [id]);

  if (m === undefined) return <div className="h-40 grid place-items-center"><Spinner /></div>;
  if (!m) return <Empty title="Match not found" />;
  const date = new Date(m.endedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="animate-rise">
      <Link to="/history" className="inline-flex items-center gap-1 text-[13px] text-fg3 hover:text-fg transition-colors">
        <ChevronLeft size={16} strokeWidth={1.5} /> Matches
      </Link>
      <h1 className="mt-4 text-[28px] md:text-[32px] leading-[1.15] font-medium">
        {m.teams.A.name} vs {m.teams.B.name}
      </h1>
      <p className="mt-1 text-sm text-fg2">{m.result?.text}</p>
      <p className="mt-1 text-[13px] text-fg3">
        {date} · {m.settings.teamSize}v{m.settings.teamSize}, {m.settings.overs} overs{Number(m.settings.innings) === 4 ? ', four innings' : ''}
        {Number(m.settings.series) > 1 ? ` · Match ${m.matchNo} of ${m.settings.series}` : ''}
      </p>
      {m.mom && (
        <Card className="mt-6 p-5 flex items-center gap-4">
          <div>
            <div className="text-[13px] text-fg3">Player of the match</div>
            <Link to={`/profile/${m.mom}`} className="text-[18px] font-medium hover:text-accent transition-colors">{m.names[m.mom]}</Link>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[13px] text-fg3">MVP points</div>
            <div className="font-mono tabular-nums text-[18px]">{m.mvp?.[m.mom] ?? 0}</div>
          </div>
        </Card>
      )}
      <div className="mt-6">
        <Scorecard innings={m.innings} names={m.names} teams={m.teams} />
      </div>
    </div>
  );
}
