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
 * The application "My applications" opens on when the address names none: the unpaid one
 * closest to running out, else the most recent (the list arrives newest first).
 */
export function pickFeaturedHold(holds: Hold[], now: number): Hold | undefined {
  const pending = holds
    .filter((hold) => effectiveStatus(hold, now) === 'HELD')
    .sort((a, b) => a.deadline - b.deadline)
  return pending[0] ?? holds[0]
}

/** When each still-unpaid application runs out; the moments a page has to look again. */
export function pendingDeadlines(holds: readonly Hold[]): number[] {
  return holds.filter((hold) => hold.status === 'HELD').map((hold) => hold.deadline)
}

export type HistoryFilter = 'all' | 'confirmed' | 'past'

const PAST: HoldStatus[] = ['EXPIRED', 'CANCELLED']

export function matchesFilter(status: HoldStatus, filter: HistoryFilter): boolean {
  if (filter === 'confirmed') return status === 'CONFIRMED'
  if (filter === 'past') return PAST.includes(status)
  return true
}
