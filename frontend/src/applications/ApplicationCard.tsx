import { IdCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Hold, HoldStatus } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow, Button, buttonClasses } from '../components/Button'
import { Countdown } from '../components/Countdown'
import { StatusPill } from '../components/StatusPill'
import { ACADEMIC_YEAR } from '../config'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { shortHoldId } from './holdDisplay'

interface ApplicationCardProps {
  hold: Hold
  /** The status to show now: a HELD hold past its deadline already reads EXPIRED. */
  status: HoldStatus
  /** The current student's number, when this application is theirs. */
  ownerId: string | null
  /** Why paying or cancelling is not possible from here, if it is not. */
  blocker?: ReactNode
  onReapply: () => void
  reapplying: boolean
}

/** The application "My applications" is about: a live countdown while held, the outcome after. */
export function ApplicationCard(props: ApplicationCardProps) {
  return (
    <article data-testid="application" className="h-full rounded-[14px] border border-line bg-white p-6">
      {props.status === 'HELD' ? <HeldBody {...props} /> : <OutcomeBody {...props} />}
    </article>
  )
}

function useClassLine(hold: Hold) {
  const { t, formatDigits } = useI18n()
  const label = useClassLabel()(hold.className ?? hold.classId)
  const details = [t('application.year', { year: formatDigits(String(ACADEMIC_YEAR)) }), label.hours].filter(Boolean)
  return { label, details }
}

function HeldBody({ hold, blocker }: ApplicationCardProps) {
  const { t, formatClock } = useI18n()
  const { label, details } = useClassLine(hold)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusPill status="HELD" dot />
        <p className="text-xs text-muted">{t('application.number', { id: shortHoldId(hold.holdId) })}</p>
      </div>

      <h2 className="mt-5 text-[25px] leading-[1.5] font-semibold text-ink">{label.full}</h2>
      <p className="mt-1 text-[15px] text-muted">{details.join('  ·  ')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[10px] bg-sage-50 px-[18px] py-3">
        <div>
          <p className="text-xs font-semibold text-muted">{t('application.timeLeft')}</p>
          <p className="mt-1.5 text-[15px] text-ink">{t('application.heldUntil', { time: formatClock(new Date(hold.deadline)) })}</p>
        </div>
        <Countdown deadline={hold.deadline} className="sm:mr-10" />
      </div>

      <p className="mt-5 text-[13px] text-muted">{t('application.simulated')}</p>

      {blocker && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-amber-wash px-3 py-2.5 text-sm font-medium text-amber-ink">
          <IdCard className="mt-0.5 size-4 shrink-0" aria-hidden />
          {blocker}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-4">
        {blocker ? (
          <>
            <Button size="lg" disabled className="w-full justify-start sm:w-[303px]">
              {t('application.pay')} <Arrow />
            </Button>
            <Button size="lg" variant="quiet" disabled className="justify-start sm:w-[178px]">
              {t('application.cancel')}
            </Button>
          </>
        ) : (
          <>
            <Link to={`/applications/${hold.holdId}/pay`} className={buttonClasses('primary', 'lg', 'w-full justify-start sm:w-[303px]')}>
              {t('application.pay')} <Arrow />
            </Link>
            <Link to={`/applications/${hold.holdId}/cancel`} className={buttonClasses('quiet', 'lg', 'justify-start sm:w-[178px]')}>
              {t('application.cancel')}
            </Link>
          </>
        )}
      </div>
    </>
  )
}

const outcomeMark: Record<Exclude<HoldStatus, 'HELD'>, { symbol: string; tone: string }> = {
  CONFIRMED: { symbol: '✓', tone: 'bg-brand-tint text-brand' },
  CANCELLED: { symbol: '×', tone: 'bg-stone-wash text-muted' },
  EXPIRED: { symbol: '◷', tone: 'bg-amber-wash text-amber-ink' },
}

function OutcomeBody({ hold, status, ownerId, onReapply, reapplying }: ApplicationCardProps) {
  const { t, formatDigits } = useI18n()
  const { label, details } = useClassLine(hold)
  const outcome = status as Exclude<HoldStatus, 'HELD'>
  const mark = outcomeMark[outcome]

  return (
    <>
      <div className="flex items-start gap-4">
        <span aria-hidden className={cn('flex size-12 shrink-0 items-center justify-center rounded-full text-[27px] leading-none font-medium', mark.tone)}>
          {mark.symbol}
        </span>
        <div className="min-w-0">
          <h2 className="text-[23px] leading-[1.55] font-semibold text-ink">{t(`outcome.${outcome}.title`)}</h2>
          <p className="mt-0.5 text-sm text-muted">{t(`outcome.${outcome}.body`)}</p>
        </div>
      </div>

      <div className="my-6 h-px bg-line" />

      <h3 className="text-[21px] leading-[1.55] font-semibold text-ink">{label.full}</h3>
      <p className="mt-1 text-sm text-muted">{details.join(' · ')}</p>

      <dl className="mt-5 grid max-w-[560px] grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted">{t('application.numberLabel')}</dt>
          <dd className="mt-1.5 text-[15px] font-medium text-ink">{shortHoldId(hold.holdId)}</dd>
        </div>
        {ownerId && (
          <div>
            <dt className="text-xs text-muted">{t('application.studentLabel')}</dt>
            <dd className="mt-1.5 text-[15px] font-medium tracking-wide text-ink">{formatDigits(ownerId)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {outcome === 'CONFIRMED' ? (
          <>
            <Link to="/" className={buttonClasses('primary', 'lg', 'w-full sm:w-[228px]')}>
              {t('outcome.browse')} <Arrow />
            </Link>
            <p className="text-[13px] text-brand">{t('outcome.noRepeat')}</p>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onReapply} loading={reapplying} className="w-full sm:w-[238px]">
              {t('outcome.reapply')} <Arrow />
            </Button>
            <Link to="/" className={buttonClasses('soft', 'lg', 'w-full sm:w-[205px]')}>
              {t('outcome.browse')}
            </Link>
          </>
        )}
      </div>
    </>
  )
}
