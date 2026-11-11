import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, renderApp, resetApi, seats } from '../test/renderApp'
import { validateClassForm } from './CreateClassPage'

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

describe('validateClassForm', () => {
  it('accepts a name and a seat count, including Bangla digits', () => {
    expect(validateClassForm(' Class 6 - Day Shift ', '১২০')).toEqual({ errors: {}, totalSeats: 120 })
  })

  it.each([
    ['', '10', { name: 'admin.error.nameRequired' }],
    ['x'.repeat(101), '10', { name: 'admin.error.nameTooLong' }],
    ['Class 6', '', { totalSeats: 'admin.error.seatsRequired' }],
    ['Class 6', '0', { totalSeats: 'admin.error.seatsInvalid' }],
    ['Class 6', '12.5', { totalSeats: 'admin.error.seatsInvalid' }],
    ['Class 6', 'many', { totalSeats: 'admin.error.seatsInvalid' }],
  ])('rejects name=%j seats=%j', (name, seatsText, errors) => {
    expect(validateClassForm(name, seatsText).errors).toEqual(errors)
  })
})

describe('CreateClassPage', () => {
  it('creates a class and confirms it to the admin', async () => {
    api.createClass.mockResolvedValue(seats({ name: 'Class 6 - Day Shift', totalSeats: 90, heldSeats: 0, confirmedSeats: 0, availableSeats: 90 }))

    renderApp('/admin/classes/new')
    await userEvent.type(screen.getByLabelText('Class name'), 'Class 6 - Day Shift')
    await userEvent.type(screen.getByLabelText('Total seats'), '90')
    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))

    expect(api.createClass).toHaveBeenCalledWith({ name: 'Class 6 - Day Shift', totalSeats: 90 })
    expect(await screen.findByText('Class “Class 6 - Day Shift” was created.')).toBeInTheDocument()
    expect(screen.getByLabelText('Class name')).toHaveValue('')
  })

  it('shows what is wrong and does not call the server for invalid input', async () => {
    renderApp('/admin/classes/new')

    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))

    expect(screen.getByText('Enter a class name.')).toBeInTheDocument()
    expect(screen.getByText('Enter the total number of seats.')).toBeInTheDocument()
    expect(api.createClass).not.toHaveBeenCalled()
  })
})
