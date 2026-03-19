// ============================================================
//  db.js — Firestore CRUD helpers
// ============================================================
import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── USERS ──────────────────────────────────────────────────
export const getUser = (uid) =>
  getDoc(doc(db, 'users', uid)).then(s => s.exists() ? s.data() : null);

export const updateUser = (uid, data) =>
  updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });

// ── PLAYERS ───────────────────────────────────────────────
export const getAllPlayers = async () => {
  const snap = await getDocs(collection(db, 'players'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getPlayersByTeam = async (teamCode) => {
  const q = query(collection(db, 'players'), where('teamCode', '==', teamCode));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updatePlayer = (uid, data) =>
  updateDoc(doc(db, 'players', uid), { ...data, updatedAt: serverTimestamp() });

export const deletePlayer = (uid) => deleteDoc(doc(db, 'players', uid));

// ── COACHES ───────────────────────────────────────────────
export const getAllCoaches = async () => {
  const snap = await getDocs(collection(db, 'coaches'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── MATCHES ───────────────────────────────────────────────
export const getAllMatches = async () => {
  const q = query(collection(db, 'matches'), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addMatch = (data) =>
  addDoc(collection(db, 'matches'), { ...data, createdAt: serverTimestamp() });

export const updateMatch = (id, data) =>
  updateDoc(doc(db, 'matches', id), { ...data, updatedAt: serverTimestamp() });

export const deleteMatch = (id) => deleteDoc(doc(db, 'matches', id));

// ── ANNOUNCEMENTS ─────────────────────────────────────────
export const getAnnouncements = async () => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addAnnouncement = (data) =>
  addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() });

export const deleteAnnouncement = (id) =>
  deleteDoc(doc(db, 'announcements', id));

// ── TRAINING PLANS ────────────────────────────────────────
export const getTrainingPlans = async () => {
  const q = query(collection(db, 'training'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addTrainingPlan = (data) =>
  addDoc(collection(db, 'training'), { ...data, createdAt: serverTimestamp() });

export const deleteTrainingPlan = (id) =>
  deleteDoc(doc(db, 'training', id));

// ── LEADERBOARD ───────────────────────────────────────────
export const getLeaderboard = async () => {
  const snap = await getDocs(collection(db, 'players'));
  const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return players
    .filter(p => p.matchesPlayed > 0)
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));
};

// ── UTIL: Format Firestore Timestamp ─────────────────────
export const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
};

export const fmtDateTime = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
};
