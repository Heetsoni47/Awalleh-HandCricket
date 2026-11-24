import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listMatches } from '../../lib/matchSave.js';
import { Card, Empty, Seg, Spinner } from '../ui.jsx';
import MatchRow from './MatchRow.jsx';

export default function History() {
  const { user } = useAuth();
  const [all, setAll] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    listMatches(60).then(setAll).catch((e) => {
      setError(e.message);
      setAll([]);
    });
  }, []);

  const rows = (all || []).filter((m) => filter === 'all' || m.playerUids?.includes(user.uid));
  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] leading-[1.15] font-medium">Matches</h1>
          <p className="mt-1 text-sm text-fg2">Every finished match with its full scorecard</p>
        </div>
        <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Everyone' }, { value: 'mine', label: 'Mine' }]} />
      </div>
      <Card className="mt-6 divide-y divide-line">
        {all === null ? (
          <div className="h-32 grid place-items-center"><Spinner /></div>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">{error || 'Finish a match and it appears here'}</Empty>
        ) : (
          rows.map((m) => <MatchRow key={m.id} m={m} me={user.uid} />)
        )}
      </Card>
    </div>
  );
}
