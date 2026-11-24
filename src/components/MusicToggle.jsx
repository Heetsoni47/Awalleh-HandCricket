import { useEffect, useState } from 'react';
import { Music, Music2 } from 'lucide-react';
import { musicState, onMusicChange, setMusicOn } from '../lib/music.js';
import { Button, cx } from './ui.jsx';

export default function MusicToggle() {
  const [s, setS] = useState(musicState());
  useEffect(() => onMusicChange(setS), []);
  if (!s.available) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      title={s.on ? 'Music on' : 'Music off'}
      aria-label={s.on ? 'Turn music off' : 'Turn music on'}
      onClick={() => setMusicOn(!s.on)}
      className="relative"
    >
      {s.on ? <Music2 size={18} strokeWidth={1.5} /> : <Music size={18} strokeWidth={1.5} className="opacity-50" />}
      {!s.on && <span className={cx('absolute w-5 h-px bg-fg2 rotate-45')} />}
    </Button>
  );
}
