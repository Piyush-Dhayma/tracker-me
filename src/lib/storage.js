// localStorage wrapper that never throws; falls back to memory when storage is blocked.
const mem = {}
export function lsGet(k) {
  try { const v = localStorage.getItem(k); return v == null ? (mem[k] ?? null) : v } catch { return mem[k] ?? null }
}
export function lsSet(k, v) {
  mem[k] = v
  try { localStorage.setItem(k, v); return true } catch { return false }
}
export function lsDel(k) {
  delete mem[k]
  try { localStorage.removeItem(k) } catch { /* ignore */ }
}
export function jget(k, d) {
  try { const v = JSON.parse(lsGet(k)); return v == null ? d : v } catch { return d }
}
export function storageWorks() {
  try { localStorage.setItem('lt_probe', '1'); localStorage.removeItem('lt_probe'); return true } catch { return false }
}
export const KEYS = ['lt_vault', 'lt_plain', 'lt_meta', 'lt_pub', 'lt_fail', 'lt_audit']
export const wipeStorage = () => KEYS.forEach(lsDel)

/** Test helper: forget the in-memory fallback copy. */
export const resetMemory = () => { for (const k in mem) delete mem[k] }
