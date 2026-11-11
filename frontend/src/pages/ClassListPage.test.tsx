import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/http'
import { api, hold, renderApp, resetApi, seats, STUDENT } from '../test/renderApp'

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

function card(name: string) {
  return within(screen.getByRole('heading', { name }).closest('article')!)
}

describe('ClassListPage', () => {
  it('shows total, held, confirmed and available seats for each class', async () => {
    api.listClasses.mockResolvedValue([seats()])

    renderApp('/')

    await screen.findByRole('heading', { name: 'Class 6 - Morning Shift' })
    const morning = card('Class 6 - Morning Shift')
    expect(morning.getByTestId('availability')).toHaveTextContent('25 seats available')
    expect(morning.getByRole('img')).toHaveAccessibleName('Of 120 seats, 80 confirmed, 15 on hold, 25 available')
  })

  it('disables applying to a full class', async () => {
    api.listClasses.mockResolvedValue([seats({ heldSeats: 40, availableSeats: 0 })])

    renderApp('/', { studentId: STUDENT })

    await screen.findByRole('heading', { name: 'Class 6 - Morning Shift' })
    expect(card('Class 6 - Morning Shift').getByRole('button', { name: 'No seats left' })).toBeDisabled()
  })

  it('asks for the birth registration number before applying, without calling the server', async () => {
    api.listClasses.mockResolvedValue([seats()])

    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }))

    expect(api.placeHold).not.toHaveBeenCalled()
    expect(screen.getByText(/Enter the student's birth registration number above before applying/)).toBeInTheDocument()
  })

  it('applies with the saved student id and opens the application', async () => {
    api.listClasses.mockResolvedValue([seats()])
    const placed = hold()
    api.placeHold.mockResolvedValue(placed)
    api.getHold.mockResolvedValue(placed)

    renderApp('/', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }))

    expect(api.placeHold).toHaveBeenCalledWith('c_1', STUDENT)
    expect(await screen.findByRole('heading', { name: 'Application status' })).toBeInTheDocument()
    expect(screen.getByTestId('countdown')).toBeInTheDocument()
  })

  it('tells the user in plain words when the last seat was just taken', async () => {
    api.listClasses.mockResolvedValue([seats({ availableSeats: 1 })])
    api.placeHold.mockRejectedValue(new ApiError(409, 'CLASS_FULL', 'No seats are available in this class right now.'))

    renderApp('/', { studentId: STUDENT })
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no seats available right now/)
  })

  it('offers "view application" instead of "apply" where the student already holds a seat', async () => {
    api.listClasses.mockResolvedValue([seats()])
    api.listMyHolds.mockResolvedValue([hold()])

    renderApp('/', { studentId: STUDENT })

    expect(await screen.findByRole('link', { name: 'View application' })).toHaveAttribute('href', '/applications/h_1')
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('saves a number typed in Bangla digits and remembers it', async () => {
    renderApp('/')

    await userEvent.type(screen.getByRole('textbox', { name: "Student's birth registration number" }), '২০১৫ ২৬৯১ ২৩৪৫ ৬৭৮৯০')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByTestId('current-student-id')).toHaveTextContent('2015 2691 2345 67890')
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
