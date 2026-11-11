import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, hold, renderApp, resetApi, STUDENT } from '../test/renderApp'

vi.mock('../api/admission', async (original) => (await import('../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)
afterEach(() => vi.useRealTimers())

describe('MyApplicationsPage', () => {
  it('opens on the unpaid application with its countdown, pay and cancel', async () => {
    const held = hold({ remainingSeconds: 125 })
    api.listMyHolds.mockResolvedValue([held])

    renderApp('/applications', { studentId: STUDENT })

    expect(await screen.findByRole('timer')).toHaveTextContent('02:05')
    expect(screen.getByText(/Your seat in Class 6 is held/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pay admission fee/ })).toHaveAttribute('href', '/applications/h_1/pay')
    expect(screen.getByRole('link', { name: 'Cancel application' })).toHaveAttribute('href', '/applications/h_1/cancel')
  })

  it('shows EXPIRED and drops the pay button the moment time runs out, without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const held = hold({ remainingSeconds: 3 })
    api.listMyHolds.mockResolvedValue([held])
    api.getHold.mockResolvedValue(held)

    renderApp('/applications/h_1', { studentId: STUDENT })
    expect(await screen.findByRole('link', { name: /Pay admission fee/ })).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(4_000))

    expect(screen.getByText('Seat hold expired')).toBeInTheDocument()
    expect(screen.getByText('Expired · Payment is no longer possible')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Pay admission fee/ })).not.toBeInTheDocument()
  })

  it('shows a confirmed admission with every step ticked', async () => {
    api.listMyHolds.mockResolvedValue([hold({ status: 'CONFIRMED', remainingSeconds: 0 })])

    renderApp('/applications', { studentId: STUDENT })

    expect(await screen.findByText('Admission confirmed', { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByText('Payment complete · Admission confirmed')).toBeInTheDocument()
    expect(screen.getByText('Your admission is confirmed')).toBeInTheDocument()
  })

  it('lists the other applications and filters them', async () => {
    api.listMyHolds.mockResolvedValue([
      hold({ holdId: 'h_1' }),
      hold({ holdId: 'h_2', classId: 'c_2', className: 'Class 7 - Day Shift', status: 'CONFIRMED', remainingSeconds: 0 }),
      hold({ holdId: 'h_3', classId: 'c_3', className: 'Class 8 - Day Shift', status: 'CANCELLED', remainingSeconds: 0 }),
    ])

    renderApp('/applications', { studentId: STUDENT })

    expect(await screen.findByRole('button', { name: 'All (2)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Class 7 — Day shift' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Class 8 — Day shift' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Past (1)' }))
    expect(screen.queryByRole('link', { name: 'Class 7 — Day shift' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Apply again/ })).toBeInTheDocument()
  })

  it('asks for the birth registration number when none is saved', async () => {
    renderApp('/applications')

    expect(await screen.findByText('Enter the birth registration number first')).toBeInTheDocument()
    expect(api.listMyHolds).not.toHaveBeenCalled()
  })

  it('blocks paying for an application that belongs to another student', async () => {
    api.getHold.mockResolvedValue(hold())
    api.listMyHolds.mockResolvedValue([])

    renderApp('/applications/h_1', { studentId: STUDENT })

    expect(await screen.findByText(/does not belong to the birth registration number/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pay admission fee/ })).toBeDisabled()
  })
})
