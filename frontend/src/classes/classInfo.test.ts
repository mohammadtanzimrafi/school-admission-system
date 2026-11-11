import { describe, expect, it } from 'vitest'
import { describeClass } from './classInfo'

describe('describeClass', () => {
  it('reads the grade and shift from an English name', () => {
    expect(describeClass('Class 6 - Morning Shift')).toEqual({
      grade: 6,
      gradeText: 'Class 6',
      shift: 'morning',
      shiftText: 'Morning Shift',
    })
  })

  it('reads a Bangla ordinal and shift', () => {
    expect(describeClass('ষষ্ঠ শ্রেণি – দিবা শিফট')).toMatchObject({ grade: 6, shift: 'day', shiftText: 'দিবা শিফট' })
  })

  it('reads Bangla digits', () => {
    expect(describeClass('শ্রেণি ১০ - প্রভাতী')).toMatchObject({ grade: 10, shift: 'morning' })
  })

  it('keeps a name it cannot read as it is', () => {
    expect(describeClass('Nursery')).toEqual({ grade: null, gradeText: 'Nursery', shift: null, shiftText: '' })
  })

  it('keeps an unknown shift as typed', () => {
    expect(describeClass('Class 3 - Evening Shift')).toMatchObject({ grade: 3, shift: null, shiftText: 'Evening Shift' })
  })
})
