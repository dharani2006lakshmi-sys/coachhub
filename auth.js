// ============================================================
//  auth.js — Login, Register, Logout
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

// ── REGISTER new user ──────────────────────────────────────
export async function registerUser({ name, email, password, role, sport, teamCode }) {
  // 1. Create Firebase Auth account
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  // 2. Build user profile document
  const profileData = {
    uid, name, email, role, sport,
    teamCode: teamCode || null,
    createdAt: serverTimestamp(),
    // Player-specific defaults
    ...(role === 'player' ? {
      position: '', jerseyNumber: '',
      age: '', height: '', weight: '',
      goals: 0, assists: 0, matchesPlayed: 0,
      fitnessScore: 0, status: 'Active'
    } : {}),
    // Coach-specific defaults
    ...(role === 'coach' ? {
      specialization: '', experience: ''
    } : {}),
    // Manager-specific defaults
    ...(role === 'manager' ? {
      department: ''
    } : {})
  };

  // 3. Save to Firestore users collection
  await setDoc(doc(db, 'users', uid), profileData);

  // 4. If player/coach/manager, also add to role-specific collection
  if (role === 'player') {
    await setDoc(doc(db, 'players', uid), profileData);
  } else if (role === 'coach') {
    await setDoc(doc(db, 'coaches', uid), profileData);
  } else if (role === 'manager') {
    await setDoc(doc(db, 'managers', uid), profileData);
  }

  return { uid, role };
}

// ── LOGIN existing user ────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  // Fetch role from Firestore
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error("User profile not found. Contact admin.");

  const data = snap.data();
  // Store in sessionStorage for quick access
  sessionStorage.setItem('ch_uid',  uid);
  sessionStorage.setItem('ch_role', data.role);
  sessionStorage.setItem('ch_name', data.name);

  return data;
}

// ── LOGOUT ────────────────────────────────────────────────
export async function logoutUser() {
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
        // Redirect to their correct dashboard
        redirectToDashboard(data.role);
        return reject('Wrong role');
      }
      sessionStorage.setItem('ch_uid',  user.uid);
      sessionStorage.setItem('ch_role', data.role);
      sessionStorage.setItem('ch_name', data.name);
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
