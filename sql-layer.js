// ============================================================
//  sql-layer.js — Parallel SQLite layer (mirrors Firebase)
//  Uses sql.js (SQLite compiled to WebAssembly) so it runs
//  entirely in the browser — no server required.
//
//  Persistence: The DB is serialised into IndexedDB after
//  every write so it survives page reloads.
//
//  Academic demo queries are exposed via window.sqlDemo.*
// ============================================================

const SQL_IDB_KEY  = 'coachhub_sqlite_db';
const SQL_IDB_NAME = 'CoachHubSQL';
const SQL_CDN      = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js';

let _db  = null;   // sql.js Database instance
let _SQL = null;   // sql.js module

// ── Bootstrap ─────────────────────────────────────────────
export async function initSQL() {
  if (_db) return _db;

  // Load sql.js from CDN
  await _loadScript(SQL_CDN);
  _SQL = await window.initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
  });

  // Try to restore persisted DB from IndexedDB
  const saved = await _idbGet(SQL_IDB_KEY);
  _db = saved ? new _SQL.Database(saved) : new _SQL.Database();

  _createSchema();
  _exposeDemo();

  console.log('[SQL] SQLite layer ready ✓');
  return _db;
}

// ── Schema ────────────────────────────────────────────────
function _createSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      uid          TEXT PRIMARY KEY,
      name         TEXT,
      email        TEXT UNIQUE,
      role         TEXT,
      sport        TEXT,
      team_code    TEXT,
      created_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS players (
      uid          TEXT PRIMARY KEY,
      name         TEXT,
      email        TEXT,
      sport        TEXT,
      team_code    TEXT,
      position     TEXT,
      jersey_no    TEXT,
      goals        INTEGER DEFAULT 0,
      assists      INTEGER DEFAULT 0,
      matches      INTEGER DEFAULT 0,
      fitness      INTEGER DEFAULT 0,
      status       TEXT    DEFAULT 'Active',
      updated_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS matches (
      id           TEXT PRIMARY KEY,
      title        TEXT,
      opponent     TEXT,
      date         TEXT,
      venue        TEXT,
      result       TEXT,
      created_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      uid          TEXT,
      email        TEXT,
      method       TEXT,   -- 'password' | 'google' | 'biometric'
      action       TEXT,   -- 'login' | 'register' | 'logout'
      ts           TEXT,
      device_info  TEXT
    );

    CREATE TABLE IF NOT EXISTS biometric_credentials (
      uid          TEXT NOT NULL,
      credential_id TEXT NOT NULL,
      device_label TEXT,
      registered_at TEXT,
      PRIMARY KEY (uid, credential_id)
    );
  `);
  _persist();
}

// ── Public write helpers (called by auth.js & db.js) ──────

export function sqlUpsertUser(user) {
  _ensureReady();
  _db.run(`
    INSERT INTO users (uid, name, email, role, sport, team_code, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      name=excluded.name, email=excluded.email,
      role=excluded.role, sport=excluded.sport,
      team_code=excluded.team_code
  `, [
    user.uid, user.name, user.email, user.role,
    user.sport || null, user.teamCode || null,
    new Date().toISOString()
  ]);
  _persist();
}

export function sqlUpsertPlayer(p) {
  _ensureReady();
  _db.run(`
    INSERT INTO players
      (uid, name, email, sport, team_code, position, jersey_no,
       goals, assists, matches, fitness, status, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(uid) DO UPDATE SET
      name=excluded.name, sport=excluded.sport,
      team_code=excluded.team_code, position=excluded.position,
      jersey_no=excluded.jersey_no, goals=excluded.goals,
      assists=excluded.assists, matches=excluded.matches,
      fitness=excluded.fitness, status=excluded.status,
      updated_at=excluded.updated_at
  `, [
    p.uid, p.name, p.email, p.sport || null, p.teamCode || null,
    p.position || null, p.jerseyNumber || null,
    p.goals || 0, p.assists || 0, p.matchesPlayed || 0,
    p.fitnessScore || 0, p.status || 'Active',
    new Date().toISOString()
  ]);
  _persist();
}

export function sqlUpsertMatch(id, m) {
  _ensureReady();
  _db.run(`
    INSERT INTO matches (id, title, opponent, date, venue, result, created_at)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, opponent=excluded.opponent,
      date=excluded.date, venue=excluded.venue, result=excluded.result
  `, [
    id, m.title || null, m.opponent || null,
    m.date || null, m.venue || null, m.result || null,
    new Date().toISOString()
  ]);
  _persist();
}

export function sqlLogAuth(uid, email, method, action) {
  _ensureReady();
  _db.run(`
    INSERT INTO auth_log (uid, email, method, action, ts, device_info)
    VALUES (?,?,?,?,?,?)
  `, [
    uid, email, method, action,
    new Date().toISOString(),
    navigator.userAgent.substring(0, 120)
  ]);
  _persist();
}

export function sqlSaveBiometricCredential(uid, credentialId, deviceLabel) {
  _ensureReady();
  _db.run(`
    INSERT INTO biometric_credentials (uid, credential_id, device_label, registered_at)
    VALUES (?,?,?,?)
    ON CONFLICT(uid, credential_id) DO NOTHING
  `, [uid, credentialId, deviceLabel || 'Unknown device', new Date().toISOString()]);
  _persist();
}

export function sqlGetBiometricCredentials(uid) {
  _ensureReady();
  return _query(
    'SELECT * FROM biometric_credentials WHERE uid = ?', [uid]
  );
}

// ── Generic query helper (returns array of row objects) ───
export function sqlQuery(sql, params = []) {
  _ensureReady();
  return _query(sql, params);
}

// ── Export DB as downloadable .sqlite file ────────────────
export function sqlExportFile() {
  _ensureReady();
  const data = _db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'coachhub.sqlite';
  a.click(); URL.revokeObjectURL(url);
}

// ── Demo queries exposed on window for console / report ──
function _exposeDemo() {
  window.sqlDemo = {
    allUsers:         () => _query('SELECT * FROM users'),
    allPlayers:       () => _query('SELECT * FROM players ORDER BY goals DESC'),
    authLog:          () => _query('SELECT * FROM auth_log ORDER BY ts DESC'),
    topScorers:       () => _query('SELECT name, sport, goals, assists FROM players ORDER BY goals+assists DESC LIMIT 5'),
    biometricUsers:   () => _query('SELECT u.name, u.email, b.device_label, b.registered_at FROM users u JOIN biometric_credentials b ON u.uid=b.uid'),
    loginsByMethod:   () => _query("SELECT method, COUNT(*) as count FROM auth_log WHERE action='login' GROUP BY method"),
    rawQuery:         (sql, p) => _query(sql, p),
    exportFile:       sqlExportFile,
    _db:              () => _db
  };
  console.log('[SQL] Demo queries available at window.sqlDemo.*');
  console.log('      e.g.  sqlDemo.allUsers()  |  sqlDemo.topScorers()  |  sqlDemo.authLog()');
}

// ── Internal helpers ──────────────────────────────────────
function _query(sql, params = []) {
  try {
    const result = _db.exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  } catch (e) {
    console.error('[SQL] Query error:', e.message, '\n', sql);
    return [];
  }
}

function _ensureReady() {
  if (!_db) throw new Error('[SQL] initSQL() has not been called yet');
}

async function _persist() {
  const data = _db.export();
  await _idbSet(SQL_IDB_KEY, data);
}

function _idbGet(key) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(SQL_IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => {
      const tx = e.target.result.transaction('kv', 'readonly');
      const r  = tx.objectStore('kv').get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror   = () => res(null);
    };
    req.onerror = () => res(null);
  });
}

function _idbSet(key, value) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(SQL_IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => {
      const tx = e.target.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej();
    };
    req.onerror = () => rej();
  });
}

function _loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
