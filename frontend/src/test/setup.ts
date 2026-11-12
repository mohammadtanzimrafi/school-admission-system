import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not lay pages out, so it cannot scroll.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn() as typeof Element.prototype.scrollTo
window.scrollTo = vi.fn() as typeof window.scrollTo

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
