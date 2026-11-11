import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateClassForm } from '../classes/validateClassForm'
import { api, renderApp, resetApi, seats } from '../test/renderApp'

vi.mock('../api/admission', async (original) => (await import('../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)

describe('validateClassForm', () => {
  it('accepts a name and a whole number of seats, in either script', () => {
    expect(validateClassForm('Class 6 - Morning Shift', '১২০')).toEqual({ errors: {}, totalSeats: 120 })
  })

  it('names what is wrong', () => {
    expect(validateClassForm('  ', '').errors).toEqual({ name: 'admin.error.nameRequired', totalSeats: 'admin.error.seatsRequired' })
    expect(validateClassForm('x'.repeat(101), '0').errors).toEqual({ name: 'admin.error.nameTooLong', totalSeats: 'admin.error.seatsInvalid' })
    expect(validateClassForm('Class 6', '12.5').errors).toEqual({ totalSeats: 'admin.error.seatsInvalid' })
  })
})

describe('ClassManagementPage', () => {
  it('adds up the seats of every class', async () => {
    api.listClasses.mockResolvedValue([seats(), seats({ id: 'c_2', name: 'Class 6 - Day Shift', totalSeats: 80, confirmedSeats: 20, heldSeats: 5, availableSeats: 55 })])

    renderApp('/admin/classes')

    expect(await screen.findByText('200')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('50% of all seats')).toBeInTheDocument()
    expect(screen.getByText('Showing all 2 classes and shifts')).toBeInTheDocument()
  })

  it('checks the form before sending anything', async () => {
    renderApp('/admin/classes')

    await userEvent.click(await screen.findByRole('button', { name: /Create class and shift/ }))

    expect(screen.getByText('Enter a class name.')).toBeInTheDocument()
    expect(screen.getByText('Enter the total number of seats.')).toBeInTheDocument()
    expect(api.createClass).not.toHaveBeenCalled()
  })

  it('creates a class and clears the form for the next one', async () => {
    api.createClass.mockResolvedValue(seats({ name: 'Class 9 - Morning Shift', totalSeats: 120, confirmedSeats: 0, heldSeats: 0, availableSeats: 120 }))

    renderApp('/admin/classes')
    const name = await screen.findByRole('textbox', { name: 'Class name' })
    await userEvent.type(name, 'Class 9 - Morning Shift')
    await userEvent.type(screen.getByRole('textbox', { name: 'Total seats' }), '120')
    await userEvent.click(screen.getByRole('button', { name: /Create class and shift/ }))

    expect(api.createClass).toHaveBeenCalledWith({ name: 'Class 9 - Morning Shift', totalSeats: 120 })
    expect(await screen.findByText('“Class 9 - Morning Shift” was created.')).toBeInTheDocument()
    expect(name).toHaveValue('')
  })
})
