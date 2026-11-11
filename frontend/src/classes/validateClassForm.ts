import type { MessageKey } from '../i18n/messages'
import { normalizeStudentId } from '../student/studentId'

export const MAX_NAME_LENGTH = 100
export const MAX_TOTAL_SEATS = 100_000

export type ClassFormErrors = { name?: MessageKey; totalSeats?: MessageKey }

/** The backend's rules, checked here first so a typo is caught before a round trip. */
export function validateClassForm(name: string, seatsText: string): { errors: ClassFormErrors; totalSeats: number } {
  const errors: ClassFormErrors = {}
  const trimmed = name.trim()
  if (trimmed.length === 0) errors.name = 'admin.error.nameRequired'
  else if (trimmed.length > MAX_NAME_LENGTH) errors.name = 'admin.error.nameTooLong'

  // Bangla digits are fine too; the student id normaliser already converts them.
  const digits = normalizeStudentId(seatsText)
  const totalSeats = Number(digits)
  if (digits.length === 0) errors.totalSeats = 'admin.error.seatsRequired'
  else if (!/^\d+$/.test(digits) || totalSeats < 1 || totalSeats > MAX_TOTAL_SEATS) errors.totalSeats = 'admin.error.seatsInvalid'

  return { errors, totalSeats }
}
