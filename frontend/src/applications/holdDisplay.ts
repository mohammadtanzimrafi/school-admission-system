import type { Hold, HoldStatus } from '../api/types'
import { effectiveStatus } from '../api/queries'

/**
 * Hold ids are UUIDs. People only need enough of one to tell their applications apart and
 * read it out on the phone, so the UI shows the last eight characters, from the random part.
 */
export function shortHoldId(holdId: string): string {
  return holdId.replace(/-/g, '').slice(-8).toUpperCase()
}

/**
 * The application "My applications" opens on: the one asked for in the address, else the
 * unpaid one closest to running out, else the most recent.
 */
export function pickFeaturedHold(holds: Hold[], requestedId: string | undefined, now: number): Hold | undefined {
  if (requestedId) return holds.find((hold) => hold.holdId === requestedId)

  const pending = holds
    .filter((hold) => effectiveStatus(hold, now) === 'HELD')
    .sort((a, b) => a.deadline - b.deadline)
  return pending[0] ?? holds[0]
}

export type HistoryFilter = 'all' | 'confirmed' | 'past'

const PAST: HoldStatus[] = ['EXPIRED', 'CANCELLED']

export function matchesFilter(status: HoldStatus, filter: HistoryFilter): boolean {
  if (filter === 'confirmed') return status === 'CONFIRMED'
  if (filter === 'past') return PAST.includes(status)
  return true
}
