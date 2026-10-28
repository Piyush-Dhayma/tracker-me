import { useEffect, useState } from 'react'

/** Re-render on an interval so clocks and "overdue" markers stay fresh. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const h = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(h)
  }, [ms])
  return now
}
