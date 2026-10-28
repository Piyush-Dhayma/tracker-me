import { C, EPC, EPS } from '../data/curriculum'
import { BADGES, DOW, WK, longest, pace, paceState, xpInfo } from '../lib/model'
import { addDays, clamp, diff, fmtD, fmtMin, pdate, sum, today } from '../lib/util'
import { Icon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'

/** Burn-up chart: chapters completed over time, the plan line, and a projection at the 14-day pace. */
function Burnup({ S }) {
  const t = today(), start = S.start < t ? S.start : t, end = S.target > t ? S.target : addDays(t, 30)
  const span = Math.max(1, diff(start, end)), W = 520, H = 250, L = 34, R = 14, Tp = 12, B = 26, pw = W - L - R, ph = H - Tp - B, tot = C.length
  const X = (k) => L + (clamp(diff(start, k), 0, span) / span) * pw
  const Y = (v) => Tp + ph - (v / tot) * ph
  const counts = {}; let cum = 0
  for (const k in S.doneAt) { const d = S.doneAt[k]; if (d < start) cum++; else counts[d] = (counts[d] || 0) + 1 }
  const days = Math.max(0, diff(start, t)), pts = []
  for (let i = 0; i <= days; i++) { const k = addDays(start, i); cum += counts[k] || 0; pts.push([X(k), Y(cum)]) }
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('')
  const last = pts[pts.length - 1]
  const area = line + 'L' + last[0].toFixed(1) + ',' + Y(0) + 'L' + pts[0][0].toFixed(1) + ',' + Y(0) + 'Z'
  const pc = pace(S)
  let proj = null
  if (pc > 0 && cum < tot) {
    const dEnd = Math.min(Math.ceil((tot - cum) / pc), diff(t, end))
    proj = <path d={`M${last[0].toFixed(1)},${last[1].toFixed(1)}L${X(addDays(t, dEnd)).toFixed(1)},${Y(cum + pc * dEnd).toFixed(1)}`} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
  }
  const showToday = diff(start, t) > span * 0.15 && diff(t, end) > span * 0.15
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chapters completed over time against the plan">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line className="gl" x1={L} x2={W - R} y1={Y(tot * f).toFixed(1)} y2={Y(tot * f).toFixed(1)} />
          <text className="ax" x={L - 6} y={(Y(tot * f) + 4).toFixed(1)} textAnchor="end">{Math.round(tot * f)}</text>
        </g>
      ))}
      <text className="ax" x={L} y={H - 6}>{fmtD(start)}</text>
      <text className="ax" x={W - R} y={H - 6} textAnchor="end">{fmtD(end)}</text>
      {showToday && (
        <>
          <text className="ax" x={X(t).toFixed(1)} y={H - 6} textAnchor="middle">today</text>
          <line className="gl" x1={X(t).toFixed(1)} x2={X(t).toFixed(1)} y1={Tp} y2={Tp + ph} strokeDasharray="3 4" />
        </>
      )}
      <path d={`M${X(S.start).toFixed(1)},${Y(0)}L${X(S.target).toFixed(1)},${Y(tot).toFixed(1)}`} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="6 5" />
      <path d={area} fill="var(--accent)" opacity=".14" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {proj}
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="4.5" fill="var(--accent)" />
    </svg>
  )
}

export default function Stats() {
  const { S } = useTracker()
  const total = sum(S.log), ad = Object.keys(S.log).filter((k) => S.log[k] > 0), avg = ad.length ? Math.round(total / ad.length) : 0
  let best = 0, bk = ''
  ad.forEach((k) => { if (S.log[k] > best) { best = S.log[k]; bk = k } })
  const xi = xpInfo(S), ps = paceState(S), pc = pace(S)
  const byEp = EPS.map((e, i) => EPC[i].reduce((a, c) => a + (S.ctime[c.id] || 0), 0))
  const att = byEp.reduce((a, b) => a + b, 0), un = Math.max(0, Math.round(total - att)), mxE = Math.max(1, ...byEp, un)
  const t = today(), dsum = [0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < 84; i++) { const k = addDays(t, -i); dsum[pdate(k).getDay()] += S.log[k] || 0 }
  const mxD = Math.max(1, ...dsum.map((x) => x / 12))

  return (
    <>
      <div className="head">
        <div><span className="lbl">Insights</span><h1>How you are doing</h1></div>
        <span className={'pill ' + ps[0]}>{ps[1]} ({ps[2] >= 0 ? '+' : ''}{ps[2].toFixed(1)} chapters)</span>
      </div>

      <div className="card xpbig">
        <div className="lvl">{xi.lv}</div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="spread"><h2>{xi.title}</h2><span className="mono small muted">{xi.xp} / {xi.next} XP</span></div>
          <div className="meter"><i style={{ width: clamp(xi.p * 100, 2, 100) + '%' }} /></div>
          <p className="small muted">XP comes from finished chapters, study minutes, focus sessions, practice problems and revisions.</p>
        </div>
      </div>

      <div className="card"><div className="stats">
        <div className="stat"><b>{(total / 60).toFixed(1)}h</b><span className="lbl">total focus</span></div>
        <div className="stat"><b>{avg}m</b><span className="lbl">per active day</span></div>
        <div className="stat"><b>{best ? best + 'm' : '-'}</b><span className="lbl">best day{bk ? ' ' + fmtD(bk) : ''}</span></div>
        <div className="stat"><b>{longest(S)}</b><span className="lbl">longest streak</span></div>
        <div className="stat"><b>{(pc * 7).toFixed(1)}</b><span className="lbl">chapters / week</span></div>
        <div className="stat"><b>{S.revCount}</b><span className="lbl">revisions</span></div>
      </div></div>

      <div className="card stack">
        <div className="spread"><h2>Progress against plan</h2><span className="lbl">solid: you &middot; dashed: plan</span></div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 420, maxWidth: 680 }}><Burnup S={S} /></div></div>
        <p className="small muted">The plan line runs from your start date to your target date. The dotted orange line projects your current 14-day pace.</p>
      </div>

      <div className="grid2">
        <div className="card stack">
          <h2>Time by episode</h2>
          {EPS.map((e, i) => (
            <div className="hb" key={e.n}>
              <span className="mono small" style={{ color: `hsl(${e.h} 60% 50%)` }}>E{i + 1}</span>
              <span className="bar"><i style={{ width: (byEp[i] / mxE) * 100 + '%', background: `hsl(${e.h} 65% 52%)` }} /></span>
              <span className="mono small">{fmtMin(byEp[i])}</span>
            </div>
          ))}
          {un > 0 && (
            <div className="hb"><span className="mono small muted">n/a</span>
              <span className="bar"><i style={{ width: (un / mxE) * 100 + '%', background: 'var(--muted)' }} /></span>
              <span className="mono small">{fmtMin(un)}</span></div>
          )}
          <p className="small muted">Counts minutes from focus sessions and quick logs while a chapter was current.</p>
        </div>
        <div className="card stack">
          <h2>Weekly rhythm</h2>
          {WK.map((d) => (
            <div className="hb" key={d}>
              <span className="mono small">{DOW[d]}</span>
              <span className="bar"><i style={{ width: (dsum[d] / 12 / mxD) * 100 + '%', background: 'var(--accent)' }} /></span>
              <span className="mono small">{Math.round(dsum[d] / 12)}m</span>
            </div>
          ))}
          <p className="small muted">Average minutes per weekday over the last 12 weeks.</p>
        </div>
      </div>

      <div className="stack">
        <h2>Badges ({Object.keys(S.badges).length} of {BADGES.length})</h2>
        <div className="bgrid">
          {BADGES.map((b) => {
            const on = S.badges[b.id]
            return (
              <div key={b.id} className={'bcard' + (on ? ' on' : '')}>
                <span className="g"><Icon n="award" s={22} /></span>
                <span><b>{b.n}</b><span className="small muted">{on ? 'Earned ' + fmtD(on) : b.d}</span></span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
