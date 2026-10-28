import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { EPS, EPC } from '../data/curriculum'
import { epProg } from '../lib/model'

export const Pill = ({ k = '', children, ...p }) => <span className={'pill ' + k} {...p}>{children}</span>
export const Meter = ({ pct }) => <div className="meter"><i style={{ width: pct + '%' }} /></div>

/** A safe external link: always https from our own builders, opens in a new tab without opener. */
export function ExtLink({ href, icon = 'yt', children }) {
  return (
    <a className="vl" href={href} target="_blank" rel="noopener noreferrer">
      <Icon n={icon} s={14} /> {children}
    </a>
  )
}

/** One ring split into nine arcs, each coloured by its episode hue. */
export function CohortRing({ S, size, sw }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2, tot = EPC.reduce((a, l) => a + l.length, 0), gap = c * 0.012
  let off = 0
  const arcs = []
  EPS.forEach((e, i) => {
    const len = c * EPC[i].length / tot - gap, p = epProg(S, i).p, rot = -90 + (off / c) * 360
    const tf = `rotate(${rot.toFixed(2)} ${m} ${m})`
    arcs.push(<circle key={'b' + i} cx={m} cy={m} r={r} fill="none" stroke="var(--surface2)" strokeWidth={sw} strokeDasharray={`${len.toFixed(2)} ${c.toFixed(2)}`} transform={tf} />)
    if (p > 0) arcs.push(<circle key={'f' + i} cx={m} cy={m} r={r} fill="none" stroke={`hsl(${e.h} 65% 52%)`} strokeWidth={sw} strokeDasharray={`${(len * p).toFixed(2)} ${c.toFixed(2)}`} transform={tf} />)
    off += len + gap
  })
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{arcs}</svg>
}

/** Weekly bar chart with a goal line. data = [{k,label,v}] */
export function Bars({ data, goal, unit }) {
  const mx = Math.max(goal, ...data.map((d) => d.v)) || 1
  return (
    <>
      <div className="cols">
        <span className="goalline" style={{ bottom: (goal / mx) * 100 + '%' }} />
        {data.map((d) => (
          <div className="c" key={d.k} title={`${d.title}: ${d.v} ${unit}`}>
            <i className={d.v >= goal ? 'hit' : d.v > 0 ? 'part' : ''} style={{ height: (d.v / mx) * 100 + '%' }} />
          </div>
        ))}
      </div>
      <div className="colsl">{data.map((d) => <span key={d.k}>{d.label}</span>)}</div>
    </>
  )
}

/** Two-click confirm for destructive buttons (label flips for 4 seconds). */
export function ConfirmButton({ onConfirm, children, className = 'btn', ...rest }) {
  const [armed, setArmed] = useState(false)
  const t = useRef(null)
  return (
    <button
      className={className}
      {...rest}
      onClick={() => {
        if (armed) { clearTimeout(t.current); setArmed(false); onConfirm() }
        else { setArmed(true); t.current = setTimeout(() => setArmed(false), 4000) }
      }}
    >
      {armed ? 'Click again to confirm' : children}
    </button>
  )
}
