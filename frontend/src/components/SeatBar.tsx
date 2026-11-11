import type { ClassSeats } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

/** Thin capacity bar: confirmed seats, then held seats, on a pale track. */
export function SeatBar({ seats }: { seats: ClassSeats }) {
  const { t, formatNumber } = useI18n()
  const { totalSeats, confirmedSeats, heldSeats, availableSeats } = seats
  const share = (part: number) => `${totalSeats > 0 ? (part / totalSeats) * 100 : 0}%`

  return (
    <div
      role="img"
      aria-label={t('card.meterLabel', {
        total: formatNumber(totalSeats),
        confirmed: formatNumber(confirmedSeats),
        held: formatNumber(heldSeats),
        available: formatNumber(availableSeats),
      })}
      className="flex h-1.5 overflow-hidden rounded-full bg-sage-100"
    >
      <div className="rounded-full bg-brand transition-[width] duration-500" style={{ width: share(confirmedSeats) }} />
      <div className="bg-held transition-[width] duration-500" style={{ width: share(heldSeats) }} />
    </div>
  )
}
