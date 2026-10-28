import { describe, expect, it } from 'vitest'
import { C, EPC, EPS } from '../src/data/curriculum'
import { BADGES, REV, defaults, longest, normalize, overall, paceState, streak, weekPlan, xpInfo } from '../src/lib/model'
import { chapterLinks, cleanHTTPS, cleanURL, practiceLinks } from '../src/lib/links'
import { addDays, today } from '../src/lib/util'
import { derive, newSalt, sealWith, openVault } from '../src/lib/crypto'
import { jget } from '../src/lib/storage'

describe('curriculum', () => {
  it('has 9 episodes and 159 chapters with unique ids', () => {
    expect(EPS).toHaveLength(9)
    expect(C).toHaveLength(159)
    expect(new Set(C.map((c) => c.id)).size).toBe(159)
    expect(EPC.reduce((a, l) => a + l.length, 0)).toBe(159)
  })
})

describe('normalize', () => {
  it('drops unknown keys and wrong types', () => {
    const r = normalize({ goal: 'abc', evil: 1, status: { e1c1: 2 }, theme: 'neon', cur: 'nope' })
    expect(r.evil).toBeUndefined()
    expect(r.goal).toBe(120)
    expect(r.theme).toBe('auto')
    expect(r.cur).toBeNull()
    expect(r.status.e1c1).toBe(2)
  })
  it('only keeps https YouTube links and https practice links', () => {
    const r = normalize({
      links: { e1c1: [{ u: 'https://youtu.be/abc', t: 'ok' }, { u: 'javascript:alert(1)', t: 'x' }, { u: 'http://youtube.com/x', t: 'y' }] },
      plog: [{ id: 'a', d: '2026-01-01', p: 'lc', lv: 'm', u: 'javascript:alert(1)' }, { id: 'b', d: '2026-01-01', p: 'zz', lv: 'm' }],
    })
    expect(r.links.e1c1).toHaveLength(1)
    expect(r.plog).toHaveLength(1)
    expect(r.plog[0].u).toBe('')
    expect(cleanURL('https://evil.com/watch')).toBeNull()
    expect(cleanHTTPS('ftp://x')).toBe('')
  })
  it('round-trips defaults', () => {
    const d = defaults()
    expect(normalize(JSON.parse(JSON.stringify(d)))).toEqual(d)
  })
})

describe('selectors', () => {
  it('counts progress, streaks, xp and week plan', () => {
    const S = defaults(), t = today()
    S.status.e1c1 = 2; S.status.e1c2 = 1
    S.doneAt.e1c1 = t; S.log[t] = 30; S.log[addDays(t, -1)] = 20
    expect(overall(S)).toMatchObject({ d: 1, g: 1, t: 159 })
    expect(streak(S)).toBe(2)
    expect(longest(S)).toBe(2)
    expect(xpInfo(S).xp).toBe(60 + 50)
    expect(paceState(S)[0]).toBeTypeOf('string')
    expect(weekPlan(S).target).toBeGreaterThan(0)
  })
  it('awards the first-step badge only after a chapter is done', () => {
    const S = defaults()
    const first = BADGES.find((b) => b.id === 'first')
    expect(first.test(S)).toBe(false)
    S.status.e1c1 = 2
    expect(first.test(S)).toBe(true)
    expect(REV).toEqual([1, 3, 7, 21, 45])
  })
})

describe('links', () => {
  it('builds Hindi search links with the latest-year bias and aptitude variants', () => {
    const l = chapterLinks(C[0], true)
    expect(l[0][1]).toContain('Hindi')
    expect(decodeURIComponent(l[0][1])).toContain(String(new Date().getFullYear()))
    expect(chapterLinks(C.find((c) => c.ep === 7), false).map((a) => a[0])).toContain('Practice MCQs')
    const arr = C.find((c) => c.t === 'Array' && c.ep === 6)
    expect(practiceLinks(arr).some((a) => a[1] === 'https://leetcode.com/tag/array/')).toBe(true)
  })
})

describe('vault crypto', () => {
  it('seals and opens with the right passcode only', async () => {
    const salt = newSalt(), key = await derive('pass1234', salt)
    await sealWith(key, salt, { hello: 'world' })
    expect(jget('lt_vault', null)).toHaveProperty('d')
    expect((await openVault('pass1234')).data).toEqual({ hello: 'world' })
    await expect(openVault('wrong')).rejects.toBeTruthy()
  })
})
