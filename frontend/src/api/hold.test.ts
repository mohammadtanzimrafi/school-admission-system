import { describe, expect, it } from 'vitest'
import { toHold } from './admission'
import { effectiveStatus } from './queries'

const NOW = Date.parse('2026-11-01T04:00:00Z')

describe('toHold', () => {
  it('derives the local deadline from the server-measured remaining time', () => {
    // The device clock is an hour off, but the countdown must still be ten minutes.
    const hold = toHold(
      { holdId: 'h', classId: 'c', status: 'HELD', expiresAt: '2026-11-01T05:10:00Z', remainingSeconds: 600 },
      NOW,
    )

    expect(hold.deadline - NOW).toBe(600_000)
  })

  it('falls back to expiresAt when the server sends no remainingSeconds', () => {
    const hold = toHold({ holdId: 'h', classId: 'c', status: 'HELD', expiresAt: '2026-11-01T04:10:00Z' }, NOW)

    expect(hold.deadline).toBe(Date.parse('2026-11-01T04:10:00Z'))
  })
})

describe('effectiveStatus', () => {
  it('shows a HELD application as EXPIRED once its deadline has passed', () => {
    const held = { status: 'HELD', deadline: NOW + 1000 } as const

    expect(effectiveStatus(held, NOW)).toBe('HELD')
    expect(effectiveStatus(held, NOW + 1000)).toBe('EXPIRED')
  })

  it('never changes a final status', () => {
    expect(effectiveStatus({ status: 'CONFIRMED', deadline: NOW - 1 }, NOW)).toBe('CONFIRMED')
    expect(effectiveStatus({ status: 'CANCELLED', deadline: NOW - 1 }, NOW)).toBe('CANCELLED')
  })
})
