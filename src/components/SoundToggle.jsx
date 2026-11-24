import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted, setMuted, onMuteChange } from '../lib/sounds.js';
import { Button } from './ui.jsx';

export default function SoundToggle() {
  const [m, setM] = useState(isMuted());
  useEffect(() => onMuteChange(setM), []);
  return (
    <Button variant="ghost" size="icon" title={m ? 'Sound off' : 'Sound on'} aria-label="Toggle sound effects" onClick={() => setMuted(!m)}>
      {m ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
    </Button>
  );
}
