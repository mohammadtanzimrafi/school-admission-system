import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/http'
import { api, hold, renderApp, resetApi, STUDENT } from '../test/renderApp'

vi.mock('../api/admission', async (original) => (await import('../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)
afterEach(() => vi.useRealTimers())

describe('PaymentPage', () => {
  it('confirms the admission through the simulated payment', async () => {
    const held = hold()
    const confirmed = hold({ status: 'CONFIRMED', remainingSeconds: 0 })
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])
    api.confirmHold.mockImplementation(async () => {
      api.getHold.mockResolvedValue(confirmed)
      api.listMyHolds.mockResolvedValue([confirmed])
      return confirmed
    })

    renderApp('/applications/h_1/pay', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: /Complete simulated payment/ }))

    expect(screen.getByText('Verifying payment')).toBeInTheDocument()
    expect(api.confirmHold).toHaveBeenCalledWith('h_1', STUDENT)
    expect(await screen.findByText('Admission confirmed', { selector: 'h2' }, { timeout: 3_000 })).toBeInTheDocument()
  })

  it('switches the pay button off when the time runs out on this page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const held = hold({ remainingSeconds: 2 })
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])

    renderApp('/applications/h_1/pay', { studentId: STUDENT })
    expect(await screen.findByRole('button', { name: /Complete simulated payment/ })).toBeEnabled()

    await act(() => vi.advanceTimersByTimeAsync(3_000))

    expect(screen.getByRole('button', { name: /Complete simulated payment/ })).toBeDisabled()
    expect(screen.getByText(/the fee for this application can no longer be paid/)).toBeInTheDocument()
  })

  it('stays on the page and explains when the server refuses the payment', async () => {
    api.getHold.mockResolvedValue(hold())
    api.listMyHolds.mockResolvedValue([hold()])
    api.confirmHold.mockRejectedValue(new ApiError(409, 'HOLD_EXPIRED', 'expired'))

    renderApp('/applications/h_1/pay', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: /Complete simulated payment/ }))

    expect(await screen.findByText('The application has expired, so the seat was released.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Complete simulated payment/ })).toBeInTheDocument()
  })
})

describe('CancelPage', () => {
  it('cancels after the guardian confirms and shows the released seat', async () => {
    const held = hold()
    const cancelled = hold({ status: 'CANCELLED', remainingSeconds: 0 })
    api.getHold.mockResolvedValue(held)
    api.listMyHolds.mockResolvedValue([held])
    api.cancelHold.mockImplementation(async () => {
      api.getHold.mockResolvedValue(cancelled)
      api.listMyHolds.mockResolvedValue([cancelled])
    })

    renderApp('/applications/h_1/cancel', { studentId: STUDENT })
    expect(await screen.findByRole('link', { name: 'No, keep it' })).toHaveAttribute('href', '/applications/h_1')
    expect(screen.getByRole('heading', { name: 'Cancel this application?' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }))

    expect(api.cancelHold).toHaveBeenCalledWith('h_1', STUDENT)
    expect(await screen.findByText('Application cancelled', { selector: 'h2' })).toBeInTheDocument()
  })

  it('does not offer to cancel an admission that is already confirmed', async () => {
    api.getHold.mockResolvedValue(hold({ status: 'CONFIRMED', remainingSeconds: 0 }))

    renderApp('/applications/h_1/cancel', { studentId: STUDENT })

    expect(await screen.findByText(/can no longer be cancelled/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yes, cancel it' })).not.toBeInTheDocument()
  })
})
