import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { admissionApi, toHold } from '../api/admission'
import type { ClassSeats, Hold, HoldDto } from '../api/types'
import { App } from '../App'
import { AppProviders } from '../AppProviders'

export const STUDENT = '20152691234567890'

/** Renders the whole app at a route, in English, with fresh caches. The API module is mocked by each test file. */
export function renderApp(route: string, options: { studentId?: string | null } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <AppProviders queryClient={queryClient} initialLocale="en" initialStudentId={options.studentId ?? null}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}

export function seats(overrides: Partial<ClassSeats> = {}): ClassSeats {
  return { id: 'c_1', name: 'Class 6 - Morning Shift', totalSeats: 120, heldSeats: 15, confirmedSeats: 80, availableSeats: 25, ...overrides }
}

export function hold(overrides: Partial<HoldDto> = {}): Hold {
  return toHold({
    holdId: 'h_1',
    classId: 'c_1',
    className: 'Class 6 - Morning Shift',
    status: 'HELD',
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    remainingSeconds: 600,
    ...overrides,
  })
}

/** The mocked API, typed so tests can set return values. */
export const api = vi.mocked(admissionApi)

/** Sensible defaults: no classes, no applications. Tests override what they care about. */
export function resetApi() {
  api.listClasses.mockResolvedValue([])
  api.listMyHolds.mockResolvedValue([])
  api.getSettings.mockResolvedValue({ holdDurationSeconds: 600 })
}
