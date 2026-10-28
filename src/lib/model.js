// State shape (v2, identical to the single-file tracker so existing backups restore), normalisation and pure selectors.
import { EPS, C, EPC, CM, PL } from '../data/curriculum'
import { cleanHTTPS, cleanURL, cleanLinks } from './links'
import { addDays, clamp, dkey, diff, pdate, sum, today, uid } from './util'

export const REV = [1, 3, 7, 21, 45]
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WK = [1, 2, 3, 4, 5, 6, 0]
export const MOOD = ['Rough', 'Meh', 'Okay', 'Good', 'Great']
export const TITLES = ['Rookie', 'Apprentice', 'Builder', 'Engineer', 'Senior', 'Staff', 'Principal', 'Architect', 'Distinguished', 'Legend']
export const LV = { e: ['Easy', ''], m: ['Medium', 'warn'], h: ['Hard', 'bad'] }
const LV_XP = { e: 10, m: 25, h: 50 }

export const WORK = [['05:45', 'Wake up and plan the day', 15], ['06:00', 'Deep study: current chapter', 90], ['07:30', 'Exercise and breakfast', 60], ['19:30', 'DSA practice', 60], ['20:45', 'Aptitude and reasoning', 30], ['21:30', 'Revision and daily log', 20], ['22:30', 'Screens off, wind down', 0]]
export const WEEKEND = [['08:00', 'Wake up and plan the day', 15], ['09:00', 'Deep study: current chapter', 120], ['14:00', 'Build a project', 120], ['17:00', 'DSA practice', 60], ['20:00', 'Weekly review and journal', 30]]
export const mkBlocks = (list, days) => list.map((x) => ({ id: uid(), time: x[0], label: x[1], min: x[2], on: true, days: days.slice() }))

export function defaults() {
  const t = dkey()
  return {
    v: 2, start: t, target: addDays(t, 270), goal: 120, theme: 'auto', notify: true, sound: true, idle: 5, lockHide: false,
    vol: 0.3, foc: 25, brk: 5, revCount: 0, status: {}, doneAt: {}, star: {}, note: {}, links: {}, fav: [], latest: true,
    plog: [], pgoal: 3, conf: {}, ctime: {}, revs: {}, log: {}, sess: {}, rdone: {}, journal: {}, badges: {}, cur: null,
    routine: mkBlocks(WORK, [1, 2, 3, 4, 5]).concat(mkBlocks(WEEKEND, [0, 6])),
  }
}

const DATE_RE = /^\d{4}-\d\d-\d\d$/
/** Whitelists keys and types from untrusted input (storage, pasted backup) and sanitises links. */
export function normalize(o) {
  const d = defaults(), r = {}
  o = o && typeof o === 'object' ? o : {}
  for (const k in d) {
    r[k] = typeof o[k] === typeof d[k] && Array.isArray(o[k]) === Array.isArray(d[k]) && o[k] !== null ? o[k] : d[k]
  }
  r.cur = typeof o.cur === 'string' && CM[o.cur] ? o.cur : null
  r.links = cleanLinks(r.links)
  r.plog = (Array.isArray(r.plog) ? r.plog : [])
    .filter((x) => x && DATE_RE.test(x.d) && PL[x.p] && ['e', 'm', 'h'].includes(x.lv)).slice(-1000)
    .map((x) => ({ id: String(x.id || uid()).slice(0, 12), d: x.d, p: x.p, lv: x.lv, t: String(x.t || '').slice(0, 80), u: cleanHTTPS(x.u), rv: !!x.rv }))
  r.pgoal = clamp(+r.pgoal || 3, 1, 50)
  r.fav = (Array.isArray(r.fav) ? r.fav : [])
    .map((l) => (l && typeof l.u === 'string' ? { u: cleanURL(l.u), t: String(l.t || '').slice(0, 60) } : null))
    .filter((l) => l && l.u).slice(0, 20)
  r.routine = r.routine
    .filter((x) => x && /^\d\d:\d\d$/.test(x.time) && typeof x.label === 'string')
    .map((x) => ({
      id: String(x.id || uid()).slice(0, 12), time: x.time, label: x.label.slice(0, 60), min: clamp(+x.min || 0, 0, 600), on: x.on !== false,
      days: Array.isArray(x.days) ? x.days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [0, 1, 2, 3, 4, 5, 6],
    }))
  r.goal = clamp(+r.goal || 120, 10, 720); r.idle = clamp(+r.idle || 0, 0, 120)
  r.foc = clamp(+r.foc || 25, 1, 180); r.brk = clamp(+r.brk || 5, 1, 60)
  r.vol = clamp(+r.vol, 0, 1) || 0; r.revCount = Math.max(0, +r.revCount || 0)
  if (!DATE_RE.test(r.start)) r.start = d.start
  if (!DATE_RE.test(r.target)) r.target = d.target
  if (!['auto', 'light', 'dark'].includes(r.theme)) r.theme = 'auto'
  return r
}

/* ---------- selectors ---------- */
export const stat = (S, id) => S.status[id] || 0
export function epProg(S, ei) {
  const l = EPC[ei]; let d = 0, g = 0
  l.forEach((c) => { const s = stat(S, c.id); if (s === 2) d++; else if (s === 1) g++ })
  return { d, g, t: l.length, p: d / l.length }
}
export function overall(S) {
  let d = 0, g = 0
  C.forEach((c) => { const s = stat(S, c.id); if (s === 2) d++; else if (s === 1) g++ })
  return { d, g, t: C.length, p: d / C.length }
}
export function activeSet(S) {
  const s = new Set()
  for (const k in S.log) if (S.log[k] > 0) s.add(k)
  for (const k in S.doneAt) s.add(S.doneAt[k])
  S.plog.forEach((x) => s.add(x.d))
  return s
}
export function streak(S) {
  const a = activeSet(S); let d = today(), n = 0
  if (!a.has(d)) d = addDays(d, -1)
  while (a.has(d)) { n++; d = addDays(d, -1) }
  return n
}
export function longest(S) {
  const a = [...activeSet(S)].sort(); let b = 0, n = 0, prev = null
  a.forEach((k) => { n = prev && diff(prev, k) === 1 ? n + 1 : 1; if (n > b) b = n; prev = k })
  return b
}
export function nextChapter(S) {
  if (S.cur && CM[S.cur] && stat(S, S.cur) !== 2) return CM[S.cur]
  return C.find((c) => stat(S, c.id) === 1) || C.find((c) => stat(S, c.id) === 0) || null
}
export function dueRevs(S) {
  const t = today()
  return Object.keys(S.revs).filter((k) => CM[k] && S.revs[k].due <= t).sort((a, b) => S.revs[a].due.localeCompare(S.revs[b].due))
}
export function pace(S) {
  const from = addDays(today(), -13); let n = 0
  for (const k in S.doneAt) if (S.doneAt[k] >= from) n++
  return n / 14
}
export function expected(S) {
  const span = Math.max(1, diff(S.start, S.target)), el = clamp(diff(S.start, today()), 0, span)
  return (C.length * el) / span
}
export function paceState(S) {
  const d = overall(S).d - expected(S)
  return d >= 2 ? ['ok', 'Ahead of plan', d] : d <= -2 ? ['warn', 'Behind plan', d] : ['acc', 'On track', d]
}
export function mondayKey() {
  const t = today(), i = (pdate(t).getDay() + 6) % 7
  return addDays(t, -i)
}
export function weekPlan(S) {
  const o = overall(S), left = o.t - o.d, weeks = Math.max(1, diff(today(), S.target) / 7)
  const target = left ? Math.max(1, Math.ceil(left / weeks)) : 0, mk = mondayKey()
  let done = 0
  for (const k in S.doneAt) if (S.doneAt[k] >= mk) done++
  const nx = nextChapter(S), list = []
  if (nx) {
    let go = false
    for (const c of C) {
      if (c.id === nx.id) go = true
      if (go && stat(S, c.id) !== 2) { list.push(c); if (list.length >= Math.max(1, target - done)) break }
    }
  }
  return { target, done, list }
}
export function xpInfo(S) {
  const dn = overall(S).d
  const xp = dn * 60 + Math.round(sum(S.log)) + S.revCount * 15 + sum(S.sess) * 10 + S.plog.reduce((a, x) => a + LV_XP[x.lv], 0)
  const lv = Math.floor(Math.sqrt(xp / 150)) + 1, base = 150 * (lv - 1) * (lv - 1), next = 150 * lv * lv
  return { xp, lv, title: TITLES[Math.min(TITLES.length - 1, lv - 1)], p: (xp - base) / (next - base), next }
}
export function pstats(S) {
  const t = today(), wk = addDays(t, -6)
  const r = { tot: 0, wk: 0, td: 0, lv: { e: 0, m: 0, h: 0 }, rv: 0, byp: {} }
  S.plog.forEach((x) => {
    r.tot++; r.lv[x.lv]++; r.byp[x.p] = (r.byp[x.p] || 0) + 1
    if (x.d >= wk) r.wk++
    if (x.d === t) r.td++
    if (x.rv) r.rv++
  })
  return r
}
export const isWeak = (S, c) => stat(S, c.id) === 2 && S.conf[c.id] > 0 && S.conf[c.id] <= 2
export const blocksFor = (S, dow) => S.routine.filter((r) => r.days.includes(dow))
export const routineDone = (S, day, id) => !!(S.rdone[day] && S.rdone[day][id])
export function nextInfo(S, now = new Date()) {
  const mod = now.getHours() * 60 + now.getMinutes(), day = dkey(now), dow = now.getDay()
  const list = S.routine
    .filter((r) => r.days.includes(dow) && !routineDone(S, day, r.id))
    .map((r) => ({ r, m: +r.time.slice(0, 2) * 60 + +r.time.slice(3) }))
    .filter((x) => x.m >= mod).sort((a, b) => a.m - b.m)
  if (!list.length) return null
  const x = list[0]
  return { label: x.r.label, time: x.r.time, in: x.m - mod }
}

export const BADGES = [
  { id: 'first', n: 'First step', d: 'Finish your first chapter', test: (S) => overall(S).d >= 1 },
  { id: 'ch10', n: 'Ten down', d: 'Finish 10 chapters', test: (S) => overall(S).d >= 10 },
  { id: 'ch50', n: 'Fifty strong', d: 'Finish 50 chapters', test: (S) => overall(S).d >= 50 },
  { id: 'half', n: 'Halfway', d: 'Finish half the cohort', test: (S) => overall(S).d >= Math.ceil(C.length / 2) },
  { id: 'ep', n: 'Episode cleared', d: 'Complete any full episode', test: (S) => EPS.some((e, i) => epProg(S, i).p === 1) },
  { id: 's3', n: 'Warm-up', d: '3-day streak', test: (S) => longest(S) >= 3 },
  { id: 's7', n: 'Week warrior', d: '7-day streak', test: (S) => longest(S) >= 7 },
  { id: 's30', n: 'Habit formed', d: '30-day streak', test: (S) => longest(S) >= 30 },
  { id: 'h10', n: 'Ten hours', d: '10 hours of study logged', test: (S) => sum(S.log) >= 600 },
  { id: 'h50', n: 'Fifty hours', d: '50 hours of study logged', test: (S) => sum(S.log) >= 3000 },
  { id: 'h100', n: 'Hundred hours', d: '100 hours of study logged', test: (S) => sum(S.log) >= 6000 },
  { id: 'rev', n: 'Memory keeper', d: 'Complete 10 revisions', test: (S) => S.revCount >= 10 },
  { id: 'p10', n: 'Problem solver', d: 'Log 10 practice problems', test: (S) => S.plog.length >= 10 },
  { id: 'p100', n: 'Century', d: 'Log 100 practice problems', test: (S) => S.plog.length >= 100 },
  { id: 'hard', n: 'Hard mode', d: 'Solve 5 hard problems', test: (S) => S.plog.filter((x) => x.lv === 'h').length >= 5 },
  { id: 'jr', n: 'Reflective', d: 'Write 7 journal entries', test: (S) => Object.keys(S.journal).filter((k) => S.journal[k].win || S.journal[k].block || S.journal[k].mood).length >= 7 },
]
