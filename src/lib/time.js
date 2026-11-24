// Server-synchronised clock using the RTDB server time offset
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebaseConfig.js';

let offset = 0;
let started = false;

export function startClock() {
  if (started) return;
  started = true;
  onValue(ref(rtdb, '.info/serverTimeOffset'), (s) => (offset = s.val() || 0));
}

export const serverNow = () => Date.now() + offset;
