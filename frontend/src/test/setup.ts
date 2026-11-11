import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not lay pages out, so it has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
