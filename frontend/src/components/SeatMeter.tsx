import type { ClassSeats } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

/** A stacked bar plus numbers: confirmed, on hold and available seats out of the total. */
export function SeatMeter({ seats }: { seats: ClassSeats }) {
  const { t, formatNumber } = useI18n()
  const { totalSeats, confirmedSeats, heldSeats, availableSeats } = seats
  const percent = (part: number) => `${totalSeats > 0 ? (part / totalSeats) * 100 : 0}%`

  const figures = [
    { label: t('seats.total'), value: totalSeats, dot: 'bg-stone-400' },
    { label: t('seats.confirmed'), value: confirmedSeats, dot: 'bg-teal-600' },
    { label: t('seats.held'), value: heldSeats, dot: 'bg-amber-400' },
    { label: t('seats.free'), value: availableSeats, dot: 'bg-stone-200 ring-1 ring-stone-300' },
  ]

  return (
    <div>
      <div
        role="img"
        aria-label={t('seats.meterLabel', {
          total: formatNumber(totalSeats),
          confirmed: formatNumber(confirmedSeats),
          held: formatNumber(heldSeats),
          available: formatNumber(availableSeats),
        })}
        className="flex h-2.5 overflow-hidden rounded-full bg-stone-200"
      >
        <div className="bg-teal-600 transition-[width] duration-500" style={{ width: percent(confirmedSeats) }} />
        <div className="bg-amber-400 transition-[width] duration-500" style={{ width: percent(heldSeats) }} />
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dd className="text-lg font-bold tabular-nums text-stone-900">{formatNumber(figure.value)}</dd>
            <dt className="flex items-center justify-center gap-1.5 text-xs text-stone-600">
              <span className={`size-2 rounded-full ${figure.dot}`} aria-hidden />
              {figure.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  )
}
