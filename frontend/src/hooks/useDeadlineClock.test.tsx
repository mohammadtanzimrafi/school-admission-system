import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeadlineClock } from './useDeadlineClock'

beforeEach(() => vi.useFakeTimers({ now: Date.parse('2026-11-01T04:00:00Z') }))
afterEach(() => vi.useRealTimers())

describe('useDeadlineClock', () => {
  it('moves only when a deadline passes, not on every tick', () => {
    const start = Date.now()
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useDeadlineClock([start + 10_000, start + 30_000])
    })
    const rendersAtMount = renders

    act(() => vi.advanceTimersByTime(9_000))
    expect(result.current).toBe(start)
    expect(renders).toBe(rendersAtMount)

    act(() => vi.advanceTimersByTime(1_500))
    expect(result.current).toBeGreaterThanOrEqual(start + 10_000)

    act(() => vi.advanceTimersByTime(20_000))
    expect(result.current).toBeGreaterThanOrEqual(start + 30_000)
    expect(renders).toBe(rendersAtMount + 2)
  })

  it('stays still when there is nothing to wait for', () => {
    const { result } = renderHook(() => useDeadlineClock([]))
    const first = result.current

    act(() => vi.advanceTimersByTime(60_000))

    expect(result.current).toBe(first)
  })
})
