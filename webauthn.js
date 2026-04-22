// ============================================================
//  webauthn.js — WebAuthn / Biometric authentication helper
//
//  Security model:
//    • Biometric data never leaves the device
//    • Only the credential ID (opaque string) is stored in
//      Firestore (users/{uid}.biometricCredentials[]) and
//      mirrored into SQLite via sql-layer.js
//    • A challenge is generated client-side (sufficient for
//      a same-origin SPA; production should use server-side)
// ============================================================

import { db }         from './firebase-config.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { sqlSaveBiometricCredential, sqlGetBiometricCredentials }
  from './sql-layer.js';

// ── Feature detection ─────────────────────────────────────
export function isBiometricSupported() {
  return !!(
    window.PublicKeyCredential &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get    === 'function'
  );
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isBiometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Registration ──────────────────────────────────────────
/**
 * Register a biometric credential for the logged-in user.
 * Stores only the credential ID in Firestore + SQLite.
 *
 * @param {string} uid   - Firebase user UID
 * @param {string} name  - Display name (used in authenticator UI)
 * @param {string} email - Email (used as user.name in authenticator)
 * @returns {string} credentialId (base64url)
 */
export async function registerBiometric(uid, name, email) {
  const challenge = _randomBytes(32);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'CoachHub SportsPMS',
        // id defaults to current origin — correct for same-origin apps
      },
      user: {
        id:          _strToBytes(uid),
        name:        email,
        displayName: name
      },
      pubKeyCredParams: [
        { alg: -7,   type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }   // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',   // device built-in (Face/Touch ID)
        userVerification:        'required',   // must verify biometric
        residentKey:             'preferred'
      },
      timeout: 60000,
      attestation: 'none'   // we don't need attestation for this use-case
    }
  });

  const credentialId = _bufferToBase64(credential.rawId);
  const deviceLabel  = _getDeviceLabel();

  // ── Persist credential ID only (no biometric data) ──────
  // 1. Firestore
  await updateDoc(doc(db, 'users', uid), {
    biometricCredentials: arrayUnion({
      credentialId,
      deviceLabel,
      registeredAt: new Date().toISOString()
    })
  });

  // 2. SQLite mirror
  sqlSaveBiometricCredential(uid, credentialId, deviceLabel);

  return credentialId;
}

// ── Authentication ────────────────────────────────────────
/**
 * Attempt biometric login.
 * Resolves with the matched credential ID on success, or
 * rejects with a descriptive Error on failure.
 *
 * @param {string[]} allowedCredentialIds - stored credential IDs for the user
 * @returns {string} matched credentialId
 */
export async function authenticateWithBiometric(allowedCredentialIds = []) {
  const challenge = _randomBytes(32);

  const allowCredentials = allowedCredentialIds.map(id => ({
    id:   _base64ToBuffer(id),
    type: 'public-key'
  }));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,   // empty = any resident key on device
      userVerification: 'required',
      timeout: 60000
    }
  });

  return _bufferToBase64(assertion.rawId);
}

// ── Firestore helpers ─────────────────────────────────────

/**
 * Fetch stored credential IDs for a user from Firestore.
 * @returns {string[]} array of base64url credential IDs
 */
export async function getStoredCredentialIds(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.biometricCredentials || []).map(c => c.credentialId);
}

/**
 * Remove a specific credential (e.g. "forget this device").
 */
export async function removeBiometricCredential(uid, credentialId) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const credentials = snap.data().biometricCredentials || [];
  const toRemove    = credentials.find(c => c.credentialId === credentialId);
  if (toRemove) {
    await updateDoc(doc(db, 'users', uid), {
      biometricCredentials: arrayRemove(toRemove)
    });
  }
}

/**
 * Check if the current device already has a registered credential.
 * We use deviceLabel as a heuristic (not cryptographically binding).
 */
export async function isCurrentDeviceRegistered(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const credentials = snap.data().biometricCredentials || [];
  const label = _getDeviceLabel();
  return credentials.some(c => c.deviceLabel === label);
}

// ── Utilities ─────────────────────────────────────────────
function _randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

function _strToBytes(str) {
  return new TextEncoder().encode(str);
}

function _bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function _base64ToBuffer(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin    = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

function _getDeviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua))  return 'iOS Device';
  if (/Android/i.test(ua))      return 'Android Device';
  if (/Mac/i.test(ua))          return 'Mac';
  if (/Windows/i.test(ua))      return 'Windows PC';
  if (/Linux/i.test(ua))        return 'Linux PC';
  return 'Unknown Device';
}
