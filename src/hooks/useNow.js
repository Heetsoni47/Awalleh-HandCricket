import { useEffect, useState } from 'react';
import { serverNow } from '../lib/time.js';

/** Server-synced clock that re-renders every `ms` */
export function useNow(ms = 200) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
