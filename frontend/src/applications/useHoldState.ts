import { useEffect } from 'react'
import { effectiveStatus, useMyHolds, useRefreshAll } from '../api/queries'
import type { Hold, HoldStatus } from '../api/types'
import { useDeadlineClock } from '../hooks/useDeadlineClock'
import type { MessageKey } from '../i18n/messages'
import { useStudent } from '../student/StudentProvider'
import { pendingDeadlines } from './holdDisplay'

/**
 * A hold's status as it stands this instant. A HELD hold reads EXPIRED the moment its
 * countdown reaches zero, with no reload, and the server is asked at once so its answer
 * (and the freed seat) follow without waiting for the next poll.
 */
export function useHoldStatus(hold: Hold | undefined): HoldStatus | undefined {
  const now = useDeadlineClock(pendingDeadlines(hold ? [hold] : []))
  const status = hold ? effectiveStatus(hold, now) : undefined
  const lapsed = hold?.status === 'HELD' && status === 'EXPIRED'
  const refreshAll = useRefreshAll()

  useEffect(() => {
    if (lapsed) void refreshAll()
  }, [lapsed, refreshAll])

  return status
}

/**
 * Whether the student in the top bar may pay for or cancel this application. Ownership is
 * known from their own list; until it loads nothing is blocked (the server checks anyway).
 */
export function useHoldOwnership(holdId: string | undefined): { studentId: string | null; ownerId: string | null; blocker: MessageKey | null } {
  const { studentId } = useStudent()
  const mine = useMyHolds(studentId).data?.some((hold) => hold.holdId === holdId)

  return {
    studentId,
    ownerId: mine ? studentId : null,
    blocker: studentId === null ? 'application.needStudent' : mine === false ? 'application.notOwner' : null,
  }
}
