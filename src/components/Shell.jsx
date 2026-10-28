import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BOTTOM, MORE, NAV } from './nav'
import { Icon } from './Icon'
import Palette from './Palette'
import { clamp } from '../lib/util'
import { dueRevs, overall, xpInfo } from '../lib/model'
import { useTracker } from '../state/TrackerProvider'

export default function Shell() {
  const { S, mode, lockNow } = useTracker()
  const loc = useLocation()
  const [pal, setPal] = useState(false)
  const [more, setMore] = useState(false)
  const due = dueRevs(S).length, x = xpInfo(S), o = overall(S)

  useEffect(() => { setMore(false); window.scrollTo && window.scrollTo(0, 0) }, [loc.pathname])

  useEffect(() => {
    const k = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((v) => !v); return }
      const tag = e.target.tagName || '', typing = /INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable
      if (!typing && !pal && e.key === '/') { e.preventDefault(); setPal(true) }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [pal])

  const moreOn = MORE.includes(loc.pathname)
  return (
    <>
      <div className="app" id="app">
        <aside className="side">
          <div className="brand"><span className="lbl">Learning tracker</span><b>Cohort 3.0</b></div>
          <button className="btn sm" onClick={() => setPal(true)} style={{ justifyContent: 'space-between', width: '100%' }}>
            <span>Search or jump</span><span className="kbd">Ctrl K</span>
          </button>
          <nav className="nav" aria-label="Sections">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <Icon n={n.icon} /><span>{n.label}</span>
                {n.to === '/revise' && due > 0 && <span className="badge">{due}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="sidefoot">
            <div className="spread"><b style={{ fontFamily: 'var(--f-display)' }}>Lv {x.lv} &middot; {x.title}</b><span className="mono small muted">{x.xp} XP</span></div>
            <div className="meter"><i style={{ width: clamp(x.p * 100, 2, 100) + '%' }} /></div>
            <div className="spread"><span className="lbl">Overall</span><span className="mono small">{Math.round(o.p * 100)}%</span></div>
            <div className="meter"><i style={{ width: o.p * 100 + '%' }} /></div>
            {mode === 'vault' && <button className="btn sm" onClick={lockNow}><Icon n="lock" s={14} /> Lock now</button>}
          </div>
        </aside>
        <main className="main fresh" key={loc.pathname}><Outlet /></main>
      </div>

      {more && (
        <div className="more" id="more">
          {NAV.filter((n) => MORE.includes(n.to)).map((n) => (
            <NavLink key={n.to} to={n.to}>
              <Icon n={n.icon} /><span>{n.label}</span>
              {n.to === '/revise' && due > 0 && <span className="badge" style={{ marginLeft: 'auto' }}>{due}</span>}
            </NavLink>
          ))}
          <button onClick={() => { setMore(false); setPal(true) }}><Icon n="search" /><span>Search or jump</span></button>
          {mode === 'vault' && <button onClick={lockNow}><Icon n="lock" /><span>Lock now</span></button>}
        </div>
      )}
      <nav className="bnav" id="bnav" aria-label="Sections">
        {BOTTOM.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} aria-label={n.label}><Icon n={n.icon} s={22} /><span>{n.label}</span></NavLink>
        ))}
        <button aria-label="More" aria-expanded={more} aria-current={moreOn ? 'page' : undefined} onClick={() => setMore((v) => !v)}>
          <Icon n="more" s={22} /><span>More</span>{due > 0 && <span className="badge">{due}</span>}
        </button>
      </nav>
      <Palette open={pal} onClose={() => setPal(false)} />
    </>
  )
}
