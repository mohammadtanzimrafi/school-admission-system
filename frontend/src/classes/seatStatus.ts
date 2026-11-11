import type { ClassSeats } from '../api/types'

export type SeatStatus = 'open' | 'limited' | 'full'

/** Ten percent or fewer seats left counts as "few seats" (4 of 100 is; 12 of 100 is not). */
const LIMITED_SHARE = 0.1

export function seatStatus({ availableSeats, totalSeats }: ClassSeats): SeatStatus {
  if (availableSeats <= 0) return 'full'
  return availableSeats / totalSeats <= LIMITED_SHARE ? 'limited' : 'open'
}
