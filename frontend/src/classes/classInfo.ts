/**
 * A class is stored as a single free-text name, e.g. "Class 6 - Morning Shift" or
 * "ষষ্ঠ শ্রেণি - প্রভাতী শিফট" (the admin screen asks for the shift inside the name).
 * This reads the grade and the shift back out of it so the UI can show a class badge,
 * filter by shift, and say both parts in the reader's language.
 */

export type ShiftKey = 'morning' | 'day'

export interface ClassInfo {
  /** The grade when the name states one: "Class 6", "Class ৬" and "ষষ্ঠ শ্রেণি" all give 6. */
  grade: number | null
  /** The part before the shift, as typed. */
  gradeText: string
  /** A shift the UI knows the hours of, or null. */
  shift: ShiftKey | null
  /** The shift part as typed; empty when the name has none. */
  shiftText: string
}

/** "Class 6 - Morning Shift", with a hyphen, en dash or em dash between spaces. */
const PART_SEPARATOR = /\s+[-–—]\s+/

const BANGLA_ORDINALS = ['প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম', 'নবম', 'দশম', 'একাদশ', 'দ্বাদশ']

const SHIFT_PATTERNS: Record<ShiftKey, RegExp> = {
  morning: /morning|প্রভাত/i,
  day: /\bday\b|দিবা/i,
}

const BANGLA_ZERO = '০'.charCodeAt(0)

/** Bangla digits to ASCII, so "৬" and "6" compare equal. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO))
}

function readGrade(text: string): number | null {
  const number = toAsciiDigits(text).match(/\d+/)
  if (number) return Number(number[0])

  const ordinal = BANGLA_ORDINALS.findIndex((word) => text.includes(word))
  return ordinal === -1 ? null : ordinal + 1
}

function readShift(text: string): ShiftKey | null {
  const match = (Object.keys(SHIFT_PATTERNS) as ShiftKey[]).find((key) => SHIFT_PATTERNS[key].test(text))
  return match ?? null
}

export function describeClass(name: string): ClassInfo {
  const [first, ...rest] = name.trim().split(PART_SEPARATOR)
  const shiftText = rest.join(' - ')

  return {
    grade: readGrade(first),
    gradeText: first,
    shift: readShift(shiftText || name),
    shiftText,
  }
}

/** The Bangla ordinal for a grade ("ষষ্ঠ" for 6), or null past twelfth grade. */
export function banglaOrdinal(grade: number): string | null {
  return BANGLA_ORDINALS[grade - 1] ?? null
}
