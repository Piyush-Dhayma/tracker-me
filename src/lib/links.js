import { CM, EXTRA, CH, TAGS, PLAT } from '../data/curriculum'

const YTH = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']
export const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q)
export const newest = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=CAI%253D'
export const ver = (latest) => (latest ? ' ' + new Date().getFullYear() + ' latest' : '')
export const chQ = (n, x, latest) => {
  const m = CH[n] || ['Hindi', '']
  return n + ' ' + x.q + (m[0] === 'English' ? '' : ' Hindi') + ver(latest)
}

export function cleanURL(u) {
  try { const x = new URL(String(u)); return x.protocol === 'https:' && YTH.includes(x.hostname) ? x.href : null } catch { return null }
}
export function cleanHTTPS(u) {
  try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.href : '' } catch { return '' }
}
export function cleanLinks(o) {
  const r = {}
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const k in o) {
      if (!CM[k] || !Array.isArray(o[k])) continue
      const a = o[k]
        .map((l) => (l && typeof l.u === 'string' ? { u: cleanURL(l.u), t: String(l.t || '').slice(0, 60) } : null))
        .filter((l) => l && l.u).slice(0, 8)
      if (a.length) r[k] = a
    }
  }
  return r
}

/** YouTube search links for a chapter: Hindi tutorial, industry level, interviews, English course. */
export function chapterLinks(c, latest) {
  const x = EXTRA[c.ep]
  const base = c.t.replace(/[&:()/]/g, ' ').replace(/\s+/g, ' ').trim()
  const v = ver(latest)
  if (c.ep === 7) {
    return [
      ['Hindi tutorial', yt(base + ' aptitude Hindi' + v)],
      ['Tricks and shortcuts', yt(base + ' aptitude tricks shortcut Hindi')],
      ['Practice MCQs', yt(base + ' aptitude MCQs practice Hindi')],
    ]
  }
  const q = c.ep === 0 && /^e1c[1-4]$/.test(c.id) ? 'computer networks' : x.q
  return [
    ['Hindi tutorial', yt(q + ' ' + base + ' Hindi' + v)],
    ['Industry level', yt(q + ' ' + base + ' industry level production real world Hindi' + v)],
    ['Interview questions', yt(q + ' ' + base + ' interview questions Hindi' + v)],
    ['English full course', yt(q + ' ' + base + ' full course' + v)],
  ]
}

/** Practice links: LeetCode topic tags for DSA chapters plus up to 3 platforms for the episode. */
export function practiceLinks(c) {
  const o = []
  if (c.ep === 6 && TAGS[c.t]) TAGS[c.t].forEach((g) => o.push(['LeetCode: ' + g.replace(/-/g, ' '), 'https://leetcode.com/tag/' + g + '/']))
  PLAT.filter((p) => p.eps.includes(c.ep)).slice(0, 3).forEach((p) => o.push([p.n, p.u]))
  return o
}
