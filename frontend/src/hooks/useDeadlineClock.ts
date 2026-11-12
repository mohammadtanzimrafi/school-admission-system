import { useEffect, useState } from 'react'

/** setTimeout cannot wait longer than this; longer waits are done in steps. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * "Now" for deciding statuses, refreshed only when one of `deadlines` passes instead of
 * several times a second. A page showing a held application re-renders once, at the moment
 * it expires; the ticking digits are left to the small countdown components (see useNow).
 */
export function useDeadlineClock(deadlines: readonly number[]): number {
  const [now, setNow] = useState(() => Date.now())
  // A string key keeps the effect from re-running for every render's new array.
  const key = deadlines.join(',')

  useEffect(() => {
    const upcoming = key === '' ? [] : key.split(',').map(Number).filter((deadline) => deadline > now)
    if (upcoming.length === 0) return

    const wait = Math.min(Math.min(...upcoming) - Date.now() + 1, MAX_TIMEOUT_MS)
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, wait))
    return () => window.clearTimeout(timer)
  }, [key, now])

  return now
}
