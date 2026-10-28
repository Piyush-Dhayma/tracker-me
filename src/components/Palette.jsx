import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, EPS } from '../data/curriculum'
import { NAV } from './nav'
import { clamp } from '../lib/util'
import { nextChapter } from '../lib/model'
import { useTracker } from '../state/TrackerProvider'
import { useAlerts } from '../state/AlertsProvider'
import { useTimer } from '../state/TimerProvider'
import { useFx } from '../state/FxProvider'

/** Ctrl/Cmd+K command palette: pages, actions and every chapter. */
export default function Palette({ open, onClose }) {
  const { S, mode, update, logMin, lockNow } = useTracker()
  const { notify } = useAlerts()
  const T = useTimer()
  const { toast } = useFx()
  const nav = useNavigate()
  const [q, setQ] = useState(''), [i, setI] = useState(0)
  const inp = useRef(null)

  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => inp.current && inp.current.focus(), 0) } }, [open])

  const items = useMemo(() => {
    const tk = q.toLowerCase().split(/\s+/).filter(Boolean)
    const focusIn = (id) => setTimeout(() => { const el = document.getElementById(id); if (el) el.focus() }, 80)
    const acts = [
      { t: 'Start or pause the focus timer', s: 'Action', run: () => { nav('/focus'); T.toggle() } },
      { t: 'Log 30 minutes of study', s: 'Action', run: () => { const n = nextChapter(S); logMin(30, n && n.id); toast('Logged', '30 minutes added to today') } },
      { t: 'Add a routine block', s: 'Action', run: () => { nav('/routine'); focusIn('rt-label') } },
      { t: 'Log a practice problem', s: 'Action', run: () => { nav('/practice'); focusIn('p-title') } },
      { t: 'Test the alarm', s: 'Action', run: () => notify('Test alarm', 'Alarms look like this.') },
      { t: 'Cycle theme (auto, light, dark)', s: 'Action', run: () => { const next = S.theme === 'auto' ? 'light' : S.theme === 'light' ? 'dark' : 'auto'; update((d) => { d.theme = next }); toast('Theme', next) } },
    ]
    if (mode === 'vault') acts.push({ t: 'Lock now', s: 'Security', run: () => lockNow() })
    const views = NAV.map((n) => ({ t: 'Go to ' + n.label, s: 'Page', run: () => nav(n.to) }))
    let list = acts.concat(views)
    if (tk.length) list = list.concat(C.map((c) => ({ t: c.t, s: 'E' + (c.ep + 1) + ' ' + EPS[c.ep].n, run: () => nav('/learn', { state: { ep: c.ep, open: c.id, k: Date.now() } }) })))
    return list.filter((x) => { const h = (x.t + ' ' + x.s).toLowerCase(); return tk.every((w) => h.includes(w)) }).slice(0, 40)
  }, [q, S, mode, nav, T, logMin, notify, toast, update, lockNow])

  const sel = clamp(i, 0, Math.max(0, items.length - 1))
  useEffect(() => { const el = document.querySelector('#pall .on'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }) }, [sel, items])
  const run = (x) => { if (!x) return; onClose(); x.run() }

  if (!open) return null
  const key = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(items.length - 1, sel + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, sel - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[sel]) }
  }
  return (
    <div id="pal" onMouseDown={(e) => { if (e.target.id === 'pal') onClose() }}>
      <div className="palcard" role="dialog" aria-label="Command palette" onKeyDown={key}>
        <input ref={inp} type="text" value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} placeholder="Jump to a chapter, page or action" autoComplete="off" aria-label="Search" />
        <ul id="pall">
          {items.length ? items.map((x, n) => (
            <li key={x.t + x.s}><button className={'pitem' + (n === sel ? ' on' : '')} onClick={() => run(x)}><span>{x.t}</span><span>{x.s}</span></button></li>
          )) : <li className="small muted" style={{ padding: 12 }}>No matches.</li>}
        </ul>
        <div className="palf">
          <span><span className="kbd">&uarr;</span> <span className="kbd">&darr;</span> move</span>
          <span><span className="kbd">Enter</span> open</span><span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  )
}
