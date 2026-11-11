import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, hold, renderApp, resetApi, STUDENT } from '../test/renderApp'

vi.mock('../api/admission', async (original) => ({
  ...(await original<typeof import('../api/admission')>()),
  admissionApi: {
    listClasses: vi.fn(),
    listMyHolds: vi.fn(),
    getHold: vi.fn(),
    confirmHold: vi.fn(),
    cancelHold: vi.fn(),
    placeHold: vi.fn(),
    createClass: vi.fn(),
    getClass: vi.fn(),
  },
}))

beforeEach(resetApi)
afterEach(() => vi.useRealTimers())

describe('ApplicationPage', () => {
  it('shows the countdown with pay and cancel buttons while the seat is held', async () => {
    const held = hold({ remainingSeconds: 125 })
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])

    renderApp('/applications/h_1', { studentId: STUDENT })

    expect(await screen.findByRole('heading', { name: 'Class 6 - Morning Shift' })).toBeInTheDocument()
    expect(screen.getByTestId('countdown')).toHaveTextContent(/^02:0[45]$/)
    expect(screen.getByRole('button', { name: 'Pay admission fee' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  })

  it('switches to EXPIRED and disables the pay button when time runs out, without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const held = hold({ remainingSeconds: 3 })
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])

    renderApp('/applications/h_1', { studentId: STUDENT })
    await screen.findByTestId('countdown')
    // The server agrees once asked again.
    api.getHold.mockResolvedValue(hold({ status: 'EXPIRED', remainingSeconds: 0 }))

    await act(() => vi.advanceTimersByTimeAsync(3_500))

    expect(screen.getByTestId('application').querySelector('[data-status]')).toHaveAttribute('data-status', 'EXPIRED')
    expect(screen.getByText('Application expired')).toBeInTheDocument()
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pay admission fee' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('confirms the admission when the fee is paid', async () => {
    const held = hold()
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])
    const confirmed = hold({ status: 'CONFIRMED', remainingSeconds: 0 })
    api.confirmHold.mockResolvedValue(confirmed)

    renderApp('/applications/h_1', { studentId: STUDENT })
    const pay = await screen.findByRole('button', { name: 'Pay admission fee' })
    api.getHold.mockResolvedValue(confirmed)
    await userEvent.click(pay)

    expect(api.confirmHold).toHaveBeenCalledWith('h_1', STUDENT)
    expect(await screen.findByRole('heading', { name: 'Admission confirmed' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pay admission fee' })).not.toBeInTheDocument()
  })

  it('asks before cancelling and only cancels after "yes"', async () => {
    const held = hold()
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])
    api.cancelHold.mockResolvedValue(undefined)

    renderApp('/applications/h_1', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('alertdialog', { name: 'Cancel this application?' })).toBeInTheDocument()
    expect(api.cancelHold).not.toHaveBeenCalled()

    api.getHold.mockResolvedValue(hold({ status: 'CANCELLED', remainingSeconds: 0 }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }))

    expect(api.cancelHold).toHaveBeenCalledWith('h_1', STUDENT)
    expect(await screen.findByRole('heading', { name: 'Application cancelled' })).toBeInTheDocument()
  })

  it('explains a failure in plain words instead of leaving a blank page', async () => {
    const { ApiError } = await import('../api/http')
    api.getHold.mockRejectedValue(new ApiError(0, 'NETWORK', 'Failed to fetch'))

    renderApp('/applications/h_1', { studentId: STUDENT })

    expect(await screen.findByRole('heading', { name: 'Could not load the application' })).toBeInTheDocument()
    expect(screen.getByText(/Cannot reach the server/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
