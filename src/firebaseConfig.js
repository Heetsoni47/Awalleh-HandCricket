// ---------------------------------------------------------------------------
// Connected to the Firebase project "awalleh-competition" (free Spark plan).
//   Authentication: Email/Password enabled
//   Realtime Database: Singapore (asia-southeast1), rules from database.rules.json
//   Firestore: Mumbai (asia-south1), rules from firestore.rules
//
// When the site goes live on GitHub Pages, add YOUR-USERNAME.github.io under
// Firebase → Authentication → Settings → Authorized domains, or sign-ups fail.
//
// These web keys are meant to be public: the security rules protect the data.
// ---------------------------------------------------------------------------

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDZ2ot0Mrgmb5ckNz1xZJKU92kVxPAreUQ',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'awalleh-competition.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://awalleh-competition-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'awalleh-competition',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'awalleh-competition.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '697653122746',
  appId: env.VITE_FIREBASE_APP_ID || '1:697653122746:web:fe04ff0341366ca8745483',
};

export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app); // live rooms, ball-by-ball, chat
export const db = getFirestore(app); // careers, match history, leaderboards

// Usernames are mapped to synthetic emails so players only need a username + password
export const USERNAME_DOMAIN = 'players.handcricket.app';
export const usernameToEmail = (u) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
