// WebCrypto: PBKDF2-SHA256 (250k) -> AES-GCM 256. Vault lives in localStorage under lt_vault.
import { lsSet, jget } from './storage'

const enc = new TextEncoder()
const dec = new TextDecoder()
export const hasCrypto = () => !!(globalThis.crypto && globalThis.crypto.subtle)
export const b64 = (buf) => {
  const a = new Uint8Array(buf); let s = ''
  for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192))
  return btoa(s)
}
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
export const newSalt = () => crypto.getRandomValues(new Uint8Array(16))

export async function derive(pass, salt) {
  const km = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function sealWith(key, salt, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)))
  lsSet('lt_vault', JSON.stringify({ v: 1, s: b64(salt), i: b64(iv), d: b64(ct) }))
}
export async function openBlob(v, pass) {
  const salt = unb64(v.s)
  const key = await derive(pass, salt)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.i) }, key, unb64(v.d))
  return { key, salt, data: JSON.parse(dec.decode(pt)) }
}
export async function openVault(pass) {
  const v = jget('lt_vault', null)
  if (!v) throw new Error('no vault')
  return openBlob(v, pass)
}
