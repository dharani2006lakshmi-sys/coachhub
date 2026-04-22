// ============================================================
//  auth.js — Login, Register, Logout
//  + SQL mirror layer (initSQL / sqlLogAuth / sqlUpsertUser)
//  + Biometric credential ID storage (webauthn.js)
// ============================================================
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── SQL layer (initialised lazily so pages that don't need
//    it don't pay the WASM startup cost)
import { initSQL, sqlLogAuth, sqlUpsertUser, sqlUpsertPlayer }
  from './sql-layer.js';

// ── Kick off SQLite init in the background immediately ────
let _sqlReady = initSQL().catch(e =>
  console.warn('[SQL] Init failed (non-fatal):', e.message)
);

// ── REGISTER new user ──────────────────────────────────────
export async function registerUser({ name, email, password, role, sport, teamCode }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  const profileData = {
    uid, name, email, role, sport,
    teamCode: teamCode || null,
    createdAt: serverTimestamp(),
    biometricCredentials: [],
    ...(role === 'player' ? {
      position: '', jerseyNumber: '',
      age: '', height: '', weight: '',
      goals: 0, assists: 0, matchesPlayed: 0,
      fitnessScore: 0, status: 'Active'
    } : {}),
    ...(role === 'coach' ? {
      specialization: '', experience: ''
    } : {}),
    ...(role === 'manager' ? {
      department: ''
    } : {})
  };

  await setDoc(doc(db, 'users', uid), profileData);

  if (role === 'player') {
    await setDoc(doc(db, 'players', uid), profileData);
  } else if (role === 'coach') {
    await setDoc(doc(db, 'coaches', uid), profileData);
  } else if (role === 'manager') {
    await setDoc(doc(db, 'managers', uid), profileData);
  }

  // SQL mirror
  await _sqlReady;
  sqlUpsertUser({ uid, name, email, role, sport, teamCode });
  if (role === 'player') sqlUpsertPlayer({ ...profileData, uid });
  sqlLogAuth(uid, email, 'password', 'register');

  return { uid, role };
}

// ── LOGIN existing user ────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error("User profile not found. Contact admin.");

  const data = snap.data();
  sessionStorage.setItem('ch_uid',  uid);
  sessionStorage.setItem('ch_role', data.role);
  sessionStorage.setItem('ch_name', data.name);

  // SQL mirror
  await _sqlReady;
  sqlUpsertUser({ uid, name: data.name, email, role: data.role, sport: data.sport, teamCode: data.teamCode });
  sqlLogAuth(uid, email, 'password', 'login');

  return data;
}

// ── BIOMETRIC LOGIN helper ─────────────────────────────────
export async function loginWithBiometricResult(uid, userData) {
  sessionStorage.setItem('ch_uid',  uid);
  sessionStorage.setItem('ch_role', userData.role);
  sessionStorage.setItem('ch_name', userData.name);

  await _sqlReady;
  sqlLogAuth(uid, userData.email || '', 'biometric', 'login');
}

// ── LOGOUT ────────────────────────────────────────────────
export async function logoutUser() {
  const uid   = sessionStorage.getItem('ch_uid');
  const email = sessionStorage.getItem('ch_email') || '';

  await _sqlReady;
  if (uid) sqlLogAuth(uid, email, 'session', 'logout');

  await signOut(auth);
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── AUTH GUARD — call on every protected page ──────────────
export function requireAuth(allowedRoles = []) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return reject('Not logged in');
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        window.location.href = 'index.html';
        return reject('No profile');
      }
      const data = snap.data();
      if (allowedRoles.length && !allowedRoles.includes(data.role)) {
        redirectToDashboard(data.role);
        return reject('Wrong role');
      }
      sessionStorage.setItem('ch_uid',  user.uid);
      sessionStorage.setItem('ch_role', data.role);
      sessionStorage.setItem('ch_name', data.name);

      // SQL mirror
      await _sqlReady;
      sqlUpsertUser({
        uid: user.uid, name: data.name, email: data.email,
        role: data.role, sport: data.sport, teamCode: data.teamCode
      });

      resolve(data);
    });
  });
}

// ── REDIRECT helper ────────────────────────────────────────
export function redirectToDashboard(role) {
  const map = {
    coach:   'dashboard-coach.html',
    player:  'dashboard-player.html',
    manager: 'dashboard-manager.html'
  };
  window.location.href = map[role] || 'index.html';
}
