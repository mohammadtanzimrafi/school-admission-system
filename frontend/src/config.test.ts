import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './config'

describe('resolveApiBaseUrl', () => {
  it('prefers the runtime value written by the container', () => {
    expect(resolveApiBaseUrl('http://api.school.test', 'http://build-time.test')).toBe('http://api.school.test')
  })

  it('falls back to the build-time variable, then to localhost:8080', () => {
    expect(resolveApiBaseUrl('', 'http://build-time.test')).toBe('http://build-time.test')
    expect(resolveApiBaseUrl('  ', undefined)).toBe('http://localhost:8080')
  })

  it('removes trailing slashes so paths can be appended safely', () => {
    expect(resolveApiBaseUrl('http://api.school.test//', undefined)).toBe('http://api.school.test')
  })
})
