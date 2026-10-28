import { Route, Routes } from 'react-router-dom'
import Gate from './components/Gate'
import Shell from './components/Shell'
import { FxProvider } from './state/FxProvider'
import { TrackerProvider, useTracker } from './state/TrackerProvider'
import { AlertsProvider } from './state/AlertsProvider'
import { TimerProvider } from './state/TimerProvider'
import Dashboard from './pages/Dashboard'
import Learn from './pages/Learn'
import Mentors from './pages/Mentors'
import Practice from './pages/Practice'
import Routine from './pages/Routine'
import Focus from './pages/Focus'
import Revise from './pages/Revise'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

function Gated() {
  const { phase } = useTracker()
  if (phase !== 'ready') return <Gate />
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="learn" element={<Learn />} />
        <Route path="mentors" element={<Mentors />} />
        <Route path="practice" element={<Practice />} />
        <Route path="routine" element={<Routine />} />
        <Route path="focus" element={<Focus />} />
        <Route path="revise" element={<Revise />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

/** Provider order matters: Fx (toasts) > Tracker (state, vault) > Alerts (alarms) > Timer. */
export default function App() {
  return (
    <FxProvider>
      <TrackerProvider>
        <AlertsProvider>
          <TimerProvider>
            <Gated />
          </TimerProvider>
        </AlertsProvider>
      </TrackerProvider>
    </FxProvider>
  )
}
