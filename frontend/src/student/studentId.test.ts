import { describe, expect, it } from 'vitest'
import { checkStudentId, isValidStudentId, normalizeStudentId } from './studentId'

describe('normalizeStudentId', () => {
  it('turns Bangla digits into ASCII digits', () => {
    expect(normalizeStudentId('২০১৫২৬৯১২৩৪৫৬৭৮৯০')).toBe('20152691234567890')
  })

  it('drops spaces and dashes used for grouping', () => {
    expect(normalizeStudentId(' 2015 2691-2345 67890 ')).toBe('20152691234567890')
  })

  it('keeps other characters so they can be reported', () => {
    expect(normalizeStudentId('2015abc')).toBe('2015abc')
  })
})

describe('checkStudentId', () => {
  it('accepts exactly 17 digits', () => {
    expect(checkStudentId('20152691234567890')).toBeNull()
    expect(isValidStudentId('20152691234567890')).toBe(true)
  })

  it.each([
    ['', 'empty'],
    ['2015269123456789', 'wrong-length'],
    ['201526912345678901', 'wrong-length'],
    ['2015269123456789x', 'not-digits'],
  ])('rejects %j as %s', (input, problem) => {
    expect(checkStudentId(input)).toBe(problem)
    expect(isValidStudentId(input)).toBe(false)
  })
})
