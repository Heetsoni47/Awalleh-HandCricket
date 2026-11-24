import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, usernameToEmail } from '../firebaseConfig.js';
import { emptyStats } from '../lib/stats.js';
import { syncPendingMatches } from '../lib/matchSave.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    let synced = false;
    return onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
      if (!s.exists()) return;
      const data = { uid: firebaseUser.uid, ...s.data() };
      setProfile(data);
      if (!synced) {
        synced = true;
        syncPendingMatches(firebaseUser.uid, data.processed || []);
      }
    });
  }, [firebaseUser]);

  async function signUp(username, password) {
    if (!USERNAME_RE.test(username)) throw new Error('Username: 3 to 16 letters, numbers or _');
    const lower = username.toLowerCase();
    const taken = await getDoc(doc(db, 'usernames', lower));
    if (taken.exists()) throw new Error('That username is taken');
    const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(lower), password);
    try {
      await setDoc(doc(db, 'usernames', lower), { uid: cred.user.uid });
      await setDoc(doc(db, 'users', cred.user.uid), {
        username,
        usernameLower: lower,
        createdAt: serverTimestamp(),
        stats: emptyStats(),
        badges: {},
        processed: [],
      });
    } catch (e) {
      await deleteUser(cred.user).catch(() => {});
      throw e;
    }
  }

  async function signIn(username, password) {
    await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  }

  const value = {
    loading: firebaseUser === undefined || (firebaseUser && !profile),
    user: firebaseUser && profile ? { uid: firebaseUser.uid, username: profile.username } : null,
    profile,
    signUp,
    signIn,
    signOut: () => signOut(auth),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function authErrorText(e) {
  const code = e?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Wrong username or password';
  if (code.includes('email-already-in-use')) return 'That username is taken';
  if (code.includes('weak-password')) return 'Password needs at least 6 characters';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again in a minute';
  if (code.includes('network')) return 'No connection to Firebase';
  return e?.message || 'Something went wrong';
}
