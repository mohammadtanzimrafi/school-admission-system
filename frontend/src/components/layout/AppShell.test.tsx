import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, renderApp, resetApi, seats } from '../../test/renderApp'

vi.mock('../../api/admission', async (original) => (await import('../../test/mockApi')).mockAdmissionModule(await original()))

beforeEach(resetApi)

describe('moving between pages', () => {
  it('starts each page at the top, moves focus to it and names it in the tab', async () => {
    api.listClasses.mockResolvedValue([seats()])
    renderApp('/')
    await screen.findByRole('heading', { name: 'Class 6' })
    expect(document.title).toBe('Find a class · Admitly')
    vi.mocked(window.scrollTo).mockClear()

    await userEvent.click(screen.getAllByRole('link', { name: 'My applications' })[0])

    await waitFor(() => expect(document.title).toBe('My applications · Admitly'))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
    expect(document.activeElement).toBe(document.getElementById('main'))
  })

  it('switches to the admin side from the keyboard', async () => {
    renderApp('/')

    await userEvent.click(screen.getByRole('button', { name: /Switch workspace/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Guardian' })).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: 'Admin' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'New class and shift' })).toBeInTheDocument()
  })

  it('closes the workspace menu with Escape and returns to its button', async () => {
    renderApp('/')
    const toggle = screen.getByRole('button', { name: /Switch workspace/ })

    await userEvent.click(toggle)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })
})
