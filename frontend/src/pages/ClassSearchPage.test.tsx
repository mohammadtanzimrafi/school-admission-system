import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/http'
import { reportServerReachable } from '../lib/connection'
import { api, hold, renderApp, resetApi, seats, STUDENT } from '../test/renderApp'

vi.mock('../api/admission', async (original) => (await import('../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)

function card(title: string, shift: string) {
  const article = screen.getAllByRole('heading', { name: title }).map((heading) => heading.closest('article')!).find((candidate) => within(candidate).queryByText(shift))
  return within(article!)
}

describe('ClassSearchPage', () => {
  it('reads the class and shift out of the name and shows its seats', async () => {
    api.listClasses.mockResolvedValue([seats()])

    renderApp('/')

    await screen.findByRole('heading', { name: 'Class 6' })
    const morning = card('Class 6', 'Morning shift')
    expect(morning.getByText('7:30 AM – 12:00 PM')).toBeInTheDocument()
    expect(morning.getByText('80 confirmed · 15 on hold · 120 total')).toBeInTheDocument()
    expect(morning.getByTestId('availability')).toHaveTextContent('25 seats free')
    expect(morning.getByRole('img')).toHaveAccessibleName('Of 120 seats, 80 confirmed, 15 on hold, 25 available')
  })

  it('tells how long a seat is held, from the backend setting', async () => {
    api.getSettings.mockResolvedValue({ holdDurationSeconds: 45 })

    renderApp('/')

    expect(await screen.findByText('Seat held for 45 seconds')).toBeInTheDocument()
  })

  it('disables applying to a full class', async () => {
    api.listClasses.mockResolvedValue([seats({ heldSeats: 40, availableSeats: 0 })])

    renderApp('/', { studentId: STUDENT })

    await screen.findByRole('heading', { name: 'Class 6' })
    expect(screen.getByRole('button', { name: 'Full' })).toBeDisabled()
  })

  it('asks for the birth registration number before applying, without calling the server', async () => {
    api.listClasses.mockResolvedValue([seats()])

    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: /Apply/ }))

    expect(api.placeHold).not.toHaveBeenCalled()
    expect(screen.getByText("Enter the student's birth registration number before applying.")).toBeInTheDocument()
  })

  it('applies with the saved number and opens the application', async () => {
    api.listClasses.mockResolvedValue([seats()])
    const placed = hold()
    // Like the server: once the seat is held, it is in the student's list too.
    api.placeHold.mockImplementation(async () => {
      api.listMyHolds.mockResolvedValue([placed])
      return placed
    })
    api.getHold.mockResolvedValue(placed)

    renderApp('/', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: /Apply/ }))

    expect(api.placeHold).toHaveBeenCalledWith('c_1', STUDENT)
    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pay admission fee/ })).toHaveAttribute('href', '/applications/h_1/pay')
  })

  it('opens the existing application when the student already applied', async () => {
    api.listClasses.mockResolvedValue([seats()])
    api.placeHold.mockRejectedValue(new ApiError(409, 'ALREADY_APPLIED', 'already', { holdId: 'h_1' }))
    api.getHold.mockResolvedValue(hold())

    renderApp('/', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: /Apply/ }))

    expect(await screen.findByText(/already has an application in progress/)).toBeInTheDocument()
    expect(await screen.findByRole('timer')).toBeInTheDocument()
  })

  it('explains a full class in plain words when the last seat goes first', async () => {
    api.listClasses.mockResolvedValue([seats()])
    api.placeHold.mockRejectedValue(new ApiError(409, 'CLASS_FULL', 'full'))

    renderApp('/', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: /Apply/ }))

    expect(await screen.findByText(/this class has no seats available right now/)).toBeInTheDocument()
  })

  it('filters by shift and by search text', async () => {
    api.listClasses.mockResolvedValue([
      seats(),
      seats({ id: 'c_2', name: 'Class 6 - Day Shift' }),
      seats({ id: 'c_3', name: 'Class 7 - Day Shift' }),
    ])

    renderApp('/')
    await screen.findAllByRole('heading', { name: 'Class 6' })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by shift' }), 'Day shift')
    expect(screen.getByText('Showing 2 classes')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox'), '7')
    expect(screen.getByText('Showing 1 classes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Class 7' })).toBeInTheDocument()
  })

  it('says it is reconnecting instead of live while the server cannot be reached', async () => {
    api.listClasses.mockResolvedValue([seats()])
    renderApp('/')
    expect(await screen.findByText('Seat numbers refresh every 5 seconds')).toBeInTheDocument()

    act(() => reportServerReachable(false))
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument()

    act(() => reportServerReachable(true))
    expect(screen.getByText('Seat numbers refresh every 5 seconds')).toBeInTheDocument()
  })

  it('explains a failed load instead of showing a blank page', async () => {
    api.listClasses.mockRejectedValue(new ApiError(0, 'NETWORK', 'down'))

    renderApp('/')

    expect(await screen.findByText('Could not load the classes')).toBeInTheDocument()
    expect(screen.getByText(/Cannot reach the server/)).toBeInTheDocument()
  })
})

describe('birth registration number', () => {
  it('saves a valid number and keeps it for the next visit', async () => {
    renderApp('/')

    await userEvent.type(screen.getByRole('textbox', { name: "Student's birth registration number" }), '2015 2691 2345 67890')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByTestId('current-student-id')).toHaveTextContent('20152691234567890')
    expect(window.localStorage.getItem('admission.studentId')).toBe(STUDENT)
  })

  it('rejects a number that is not 17 digits and says why', async () => {
    renderApp('/')

    await userEvent.type(screen.getByRole('textbox', { name: "Student's birth registration number" }), '12345')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toHaveTextContent('The number must be exactly 17 digits. You entered 5.')
    expect(screen.queryByTestId('current-student-id')).not.toBeInTheDocument()
  })
})
