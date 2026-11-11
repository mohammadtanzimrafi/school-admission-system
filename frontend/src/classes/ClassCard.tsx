import { Link } from 'react-router'
import type { ClassSeats, Hold } from '../api/types'
import { Arrow, Button, buttonClasses } from '../components/Button'
import { SeatBar } from '../components/SeatBar'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { seatStatus } from './seatStatus'
import type { ClassLabel } from './useClassLabel'

interface ClassCardProps {
  seats: ClassSeats
  label: ClassLabel
  /** The student's own seat-occupying application here, if any. */
  ownHold?: Hold
  applying: boolean
  busy: boolean
  onApply: () => void
}

/** One class and shift: who has the seats, how many are left, and the way in. */
export function ClassCard({ seats, label, ownHold, applying, busy, onApply }: ClassCardProps) {
  const { t, formatNumber } = useI18n()
  const status = seatStatus(seats)

  const tag = ownHold
    ? { text: t(ownHold.status === 'CONFIRMED' ? 'card.status.admitted' : 'card.status.applied'), tone: 'text-brand' }
    : status === 'full'
      ? { text: t('card.status.full'), tone: 'text-muted' }
      : status === 'limited'
        ? { text: t('card.status.limited'), tone: 'text-amber-ink' }
        : { text: t('card.status.open'), tone: 'text-brand' }

  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-[19px]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn('flex size-[42px] shrink-0 items-center justify-center rounded-[10px] text-xl font-semibold text-brand', ownHold ? 'bg-sage-200' : 'bg-sage-100')}
        >
          {label.badge}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] leading-[1.5] font-semibold text-ink">{label.title}</h3>
          {label.shift && <p className="text-sm text-muted">{label.shift}</p>}
        </div>
        <p className={cn('pt-1.5 text-xs font-medium whitespace-nowrap', tag.tone)}>{tag.text}</p>
      </div>

      {label.hours && <p className="mt-4 text-sm text-muted">{label.hours}</p>}

      <div className="mt-4">
        <SeatBar seats={seats} />
      </div>
      <p className="mt-3 text-xs text-muted">
        {t('card.breakdown', {
          confirmed: formatNumber(seats.confirmedSeats),
          held: formatNumber(seats.heldSeats),
          total: formatNumber(seats.totalSeats),
        })}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <p data-testid="availability" className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink tabular">{formatNumber(Math.max(0, seats.availableSeats))}</span>{' '}
          <span className="text-[13px] text-muted">{t('card.available')}</span>
        </p>

        {ownHold ? (
          <Link to={`/applications/${ownHold.holdId}`} className={buttonClasses('primary', 'md', 'w-[160px]')}>
            {t('card.open')} <Arrow />
          </Link>
        ) : (
          <Button onClick={onApply} loading={applying} disabled={status === 'full' || busy} className="w-[160px]">
            {applying ? t('card.applying') : status === 'full' ? t('card.full') : <>{t('card.apply')} <Arrow /></>}
          </Button>
        )}
      </div>
    </article>
  )
}
