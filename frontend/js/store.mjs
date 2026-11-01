import {validateSnapshot} from './domain.mjs?v=24';

// Override in config.js for a separate backend; same-origin works for FastAPI.
const native = window.Capacitor?.isNativePlatform?.();
export const API_BASE = window.DRIVELEGAL_API_BASE ?? (native || location.hostname.endsWith('.vercel.app') ? 'https://drivelegal-road-safety-hackathon-2026.onrender.com' : '');
export const preference = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(`dl:${key}`)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`dl:${key}`, JSON.stringify(value)); } catch { /* session still works */ } },
};
export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {...options, signal: options.signal || AbortSignal.timeout(18000)});
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json();
}
async function storageTimeout(operation) {
  let timer;
  try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Local storage did not respond')), 2000); })]); }
  finally { clearTimeout(timer); }
}
let database;
async function openDB() {
  if (database) return database;
  database = await new Promise((resolve, reject) => {
    const open = indexedDB.open('drivelegal-modern', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('snapshots');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('Storage blocked'));
  });
  return database;
}
async function cachedSnapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('snapshots').objectStore('snapshots').get('current');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveSnapshot(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').put(data, 'current');
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export async function loadSnapshot() {
  try { const data = await storageTimeout(cachedSnapshot()); if (validateSnapshot(data)) return {...data, origin:'cached'}; } catch { /* bundled fallback */ }
  const response = await fetch('data/snapshot.json');
  if (!response.ok) throw new Error('The offline library could not be loaded. Reconnect and reload.');
  const data = await response.json();
  if (!validateSnapshot(data)) throw new Error('The law dataset is incomplete.');
  storageTimeout(saveSnapshot(data)).catch(() => {});
  return {...data, origin:'bundled'};
}
export async function syncSnapshot() {
  const [laws, jurisdictions, violations, vehicles, categories] = await Promise.all([
    '/api/laws/export/all', '/api/locations', '/api/locations/violations', '/api/locations/vehicle-classes', '/api/locations/violation-categories',
  ].map(path => request(path)));
  const data = {version:1, laws, jurisdictions, violations, vehicles, categories, syncedAt: new Date().toISOString()};
  if (!validateSnapshot(data)) throw new Error('Backend dataset is empty or incompatible; keeping the offline library.');
  try { await storageTimeout(saveSnapshot(data)); } catch { /* keep in memory */ }
  return {...data, origin:'server'};
}
