export const STUDENT_ID_LENGTH = 17

const BANGLA_ZERO = '০'.charCodeAt(0)

/**
 * Cleans up what a guardian typed: Bangla digits (০-৯) become 0-9, and spaces or
 * dashes used for grouping are dropped. Anything else is left in so it can be reported.
 */
export function normalizeStudentId(input: string): string {
  return input
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO))
    .replace(/[\s-]/g, '')
}

export type StudentIdProblem = 'empty' | 'not-digits' | 'wrong-length'

/** Returns what is wrong with an (already normalized) id, or null when it is valid. */
export function checkStudentId(normalized: string): StudentIdProblem | null {
  if (normalized.length === 0) return 'empty'
  if (!/^\d+$/.test(normalized)) return 'not-digits'
  if (normalized.length !== STUDENT_ID_LENGTH) return 'wrong-length'
  return null
}

export function isValidStudentId(value: string | null | undefined): value is string {
  return typeof value === 'string' && checkStudentId(value) === null
}

