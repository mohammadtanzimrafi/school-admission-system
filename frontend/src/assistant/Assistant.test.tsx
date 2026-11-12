import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, hold, renderApp, resetApi, seats, STUDENT } from '../test/renderApp'

vi.mock('../api/admission', async (original) => (await import('../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)

async function openChat() {
  await userEvent.click(screen.getByRole('button', { name: 'Get help' }))
  return within(await screen.findByRole('dialog', { name: 'Admitly assistant' }))
}

describe('help assistant', () => {
  it('greets and answers a suggested question with a way to act on it', async () => {
    renderApp('/')
    const chat = await openChat()

    expect(chat.getByText(/I'm the Admitly assistant/)).toBeInTheDocument()
    await userEvent.click(chat.getByRole('button', { name: 'How do I apply?' }))

    expect(await chat.findByText(/On "Find a class", press "Apply"/)).toBeInTheDocument()
    expect(chat.getByRole('button', { name: 'Enter the number' })).toBeInTheDocument()
  })

  it("answers from the student's own situation", async () => {
    api.listMyHolds.mockResolvedValue([hold({ remainingSeconds: 125 })])

    renderApp('/', { studentId: STUDENT })
    const chat = await openChat()
    await userEvent.type(chat.getByRole('textbox', { name: 'Type a question…' }), 'what is my status{Enter}')

    expect(await chat.findByText(/Class 6 — Morning shift: seat held, fee due/)).toBeInTheDocument()
    expect(chat.getByRole('link', { name: /Pay admission fee/ })).toHaveAttribute('href', '/applications/h_1/pay')
  })

  it('lists the classes that have free seats', async () => {
    api.listClasses.mockResolvedValue([seats(), seats({ id: 'c_2', name: 'Class 8 - Day Shift', availableSeats: 0 })])

    renderApp('/')
    await screen.findByRole('heading', { name: 'Class 6' })
    const chat = await openChat()
    await userEvent.type(chat.getByRole('textbox', { name: 'Type a question…' }), 'which classes have seats available?{Enter}')

    expect(await chat.findByText(/Class 6 — Morning shift: 25 free/)).toBeInTheDocument()
    expect(chat.queryByText(/Class 8/)).not.toBeInTheDocument()
  })

  it('admits when it does not understand and offers the usual questions', async () => {
    renderApp('/')
    const chat = await openChat()
    await userEvent.type(chat.getByRole('textbox', { name: 'Type a question…' }), 'the weather is nice{Enter}')

    expect(await chat.findByText(/didn't understand that/)).toBeInTheDocument()
    expect(chat.getByRole('button', { name: 'How do I cancel?' })).toBeInTheDocument()
  })

  it('opens from the sidebar help link, closes with Escape and keeps the conversation', async () => {
    renderApp('/')
    await userEvent.click(screen.getAllByRole('button', { name: 'Admission help' })[0])
    const chat = within(await screen.findByRole('dialog', { name: 'Admitly assistant' }))
    await userEvent.type(chat.getByRole('textbox', { name: 'Type a question…' }), 'hello{Enter}')
    await chat.findAllByText(/I'm the Admitly assistant/)

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get help' })).toHaveFocus()

    const reopened = await openChat()
    expect(reopened.getByText('hello')).toBeInTheDocument()
  })
})
