// Commit-reveal for hidden picks: players publish sha256(pick:salt) first,
// reveal the pick only after both have locked in. Nobody can peek at the database.

export async function hashPick(pick, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pick}:${salt}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newSalt() {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const randomPick = () => 1 + Math.floor(Math.random() * 6);
