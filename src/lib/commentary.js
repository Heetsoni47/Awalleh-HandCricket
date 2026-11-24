// Auto-generated ball-by-ball commentary. Deterministic per ball so every client agrees.

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

const RUNS = {
  1: [
    '{bat} dabs it away for a single.',
    'Quick single, {bat} keeps the board ticking.',
    '{bat} nudges one into the gap.',
  ],
  2: [
    'Two more for {bat}, good running.',
    '{bat} works it wide for a couple.',
    'Pushed into the deep, they come back for two.',
  ],
  3: [
    'Three! {bat} finds the outfield and runs hard.',
    '{bat} threads it, three runs.',
  ],
  4: [
    'Cracking shot, FOUR for {bat}.',
    'Pierced the field, {bat} collects four.',
    'FOUR. {bowl} drifted onto the pads and {bat} said thank you.',
  ],
  5: [
    'Five! {bat} goes big and the fielders cannot stop it.',
    'Overthrows and chaos, five to {bat}.',
  ],
  6: [
    'BOOM! {bat} smashes a 6!',
    'Into the stands. {bat} launches {bowl} for SIX.',
    'That is massive, SIX for {bat}!',
    '{bat} clears the rope with ease. SIX.',
  ],
};

const OUT = [
  '{bowl} reads it perfectly. {bat} has to walk for {r}.',
  'Bowled him! {bat} departs for {r}.',
  'OUT! Same number, {bowl} strikes and {bat} goes for {r}.',
  'Caught in the deep, {bat} out for {r}.',
];

const DUCK = [
  '{bat} goes for a duck. {bowl} is pumped.',
  'Out for nought, {bat} trudges off.',
];

const GOLDEN = [
  'CLEAN BOWLED! Golden duck for {bat}!',
  'First ball, gone. Golden duck for {bat}.',
];

const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export function ballLine({ seed, bat, bowl, runs, out, batterRuns, firstBall, auto }) {
  if (out) {
    const tpl = firstBall ? pick(GOLDEN, seed) : batterRuns === 0 ? pick(DUCK, seed) : pick(OUT, seed);
    const extra = auto ? ' (shot clock ran out)' : '';
    return fill(tpl, { bat, bowl, r: batterRuns }) + extra;
  }
  return fill(pick(RUNS[runs], seed), { bat, bowl });
}

export function milestoneLine(name, m) {
  if (m === 100) return `CENTURY for ${name}! Take a bow.`;
  if (m === 50) return `Fifty up for ${name}, raises the bat.`;
  return `${name} brings up 30.`;
}

// Chat feed announcements (system messages)
export function sysForBall({ bat, runs, out, golden, duck, milestone }) {
  const msgs = [];
  if (out && golden) msgs.push(`🦆 ${bat} is out for a Golden Duck!`);
  else if (out && duck) msgs.push(`🦆 ${bat} is out for a duck`);
  else if (out) msgs.push(`☝️ Wicket! ${bat} is out`);
  if (!out && runs === 6) msgs.push(`🔥 ${bat} hit a SIX!`);
  if (milestone === 100) msgs.push(`💯 Century for ${bat}!`);
  else if (milestone === 50) msgs.push(`🏏 Fifty for ${bat}`);
  return msgs;
}
