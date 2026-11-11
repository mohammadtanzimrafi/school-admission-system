/** A class (one shift) with its live seat numbers. Mirrors GET /classes. */
export interface ClassSeats {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
}

export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'

/** An application exactly as the API returns it. */
export interface HoldDto {
  holdId: string
  classId: string
  className?: string
  studentId?: string
  status: HoldStatus
  expiresAt: string
  /** Seconds left on the hold, measured by the server clock. */
  remainingSeconds?: number
}

/** An application as the UI uses it. */
export interface Hold extends HoldDto {
  /**
   * When the hold runs out, on *this device's* clock (epoch milliseconds). It is derived
   * from the server's remainingSeconds at the moment the response arrived, so a device
   * whose clock is wrong still counts down correctly.
   */
  deadline: number
}

export interface CreateClassInput {
  name: string
  totalSeats: number
}

/** Public backend settings. Mirrors GET /settings. */
export interface Settings {
  holdDurationSeconds: number
}
