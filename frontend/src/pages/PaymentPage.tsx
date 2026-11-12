import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { HoldGate } from '../applications/HoldGate'
import { shortHoldId } from '../applications/holdDisplay'
import { useHoldOwnership, useHoldStatus } from '../applications/useHoldState'
import { useConfirmHold } from '../api/queries'
import type { Hold, HoldStatus } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow, Button, buttonClasses } from '../components/Button'
import { Countdown } from '../components/Countdown'
import { Lines, PageHeader, Skeleton } from '../components/Feedback'
import { Pill, StatusPill } from '../components/StatusPill'
import { ProgressSteps } from '../components/Steps'
import { useToast } from '../components/Toasts'
import { ACADEMIC_YEAR } from '../config'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'

/** Long enough to read "verifying payment"; the request itself is sent straight away. */
const MIN_PROCESSING_MS = 1_200

export function PaymentPage() {
  const { holdId = '' } = useParams()
  const { t } = useI18n()
  useDocumentTitle(t('crumb.payment'))

  const crumbs = [t('crumb.admissions'), t('crumb.payment')]

  return (
    <HoldGate
      holdId={holdId}
      header={<PageHeader crumbs={crumbs} title={t('payment.title')} subtitle={t('payment.subtitle')} />}
      skeleton={<Skeleton className="h-[513px]" />}
    >
      {(hold) => <Payment hold={hold} crumbs={crumbs} />}
    </HoldGate>
  )
}

function Payment({ hold, crumbs }: { hold: Hold; crumbs: string[] }) {
  const { t, formatDigits, formatClock, describeError } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const status = useHoldStatus(hold) ?? hold.status
  const { studentId, ownerId, blocker } = useHoldOwnership(hold.holdId)
  const confirm = useConfirmHold()
  const [processing, setProcessing] = useState(false)
  const leaveTimer = useRef<number | undefined>(undefined)
  const label = useClassLabel()(hold.className ?? hold.classId)
  const applicationLink = `/applications/${hold.holdId}`

  // Leaving the page early must not let a pending "go to the application" fire later.
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  function pay() {
    if (studentId === null) return
    setProcessing(true)
    const startedAt = Date.now()

    confirm.mutate(
      { holdId: hold.holdId, studentId },
      {
        onSuccess: () => {
          leaveTimer.current = window.setTimeout(() => {
            toast.success(t('payment.done'))
            navigate(applicationLink, { replace: true })
          }, Math.max(0, MIN_PROCESSING_MS - (Date.now() - startedAt)))
        },
        onError: (error) => {
          setProcessing(false)
          toast.error(describeError(error))
        },
      },
    )
  }

  const confirmed = status === 'CONFIRMED'

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={t('payment.title')}
        subtitle={t('payment.subtitle')}
        aside={status === 'HELD' && <Countdown deadline={hold.deadline} label={t('payment.timeLeft')} className="sm:mr-5" />}
      />

      <ProgressSteps
        label={t('payment.progressLabel')}
        steps={[
          { title: t('payment.step.choose'), state: 'done' },
          { title: t('payment.step.pay'), state: confirmed ? 'done' : 'current' },
          { title: t('payment.step.done'), state: confirmed ? 'done' : 'upcoming' },
        ]}
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_382px]">
        <section className="rounded-[14px] border border-line bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[21px] font-semibold text-ink">{t('payment.summary')}</h2>
            <StatusPill status={status} className="px-4" />
          </div>
          <p className="mt-7 text-[26px] leading-[1.5] font-semibold text-ink">{label.full}</p>
          <p className="mt-1 text-[15px] text-muted">{t('application.year', { year: formatDigits(String(ACADEMIC_YEAR)) })}</p>

          <dl className="mt-6 border-t border-line pt-5">
            <SummaryRow term={t('application.numberLabel')} value={shortHoldId(hold.holdId)} />
            {ownerId && <SummaryRow term={t('application.studentLabel')} value={formatDigits(ownerId)} />}
            {label.hours && <SummaryRow term={t('payment.classHours')} value={label.hours} />}
            {status === 'HELD' && (
              <SummaryRow term={t('payment.heldUntil')} value={t('payment.heldUntilValue', { time: formatClock(new Date(hold.deadline)) })} />
            )}
          </dl>

          <p className="mt-5 rounded-lg bg-sage-50 px-4 py-2.5 text-[13px] text-muted">
            <Lines text={t('payment.notice')} />
          </p>
        </section>

        <section className="rounded-[14px] border border-line bg-white p-6">
          {processing ? (
            <Processing />
          ) : status === 'HELD' ? (
            <PayPanel blocker={blocker ? t(blocker) : null} applicationLink={applicationLink} onPay={pay} />
          ) : (
            <ClosedPanel status={status} applicationLink={applicationLink} />
          )}
        </section>
      </div>

      <p className="mt-9 text-[13px] text-muted">{t('payment.gateway')}</p>
    </>
  )
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="text-right text-[15px] font-medium text-ink">{value}</dd>
    </div>
  )
}

function PanelIntro({ children }: { children: ReactNode }) {
  const { t } = useI18n()

  return (
    <>
      <Pill tone="lime" className="px-4">{t('payment.badge')}</Pill>
      <h2 className="mt-8 text-[23px] font-semibold text-ink">{t('payment.panelTitle')}</h2>
      <p className="mt-2 text-base text-muted">
        <Lines text={t('payment.panelBody')} />
      </p>
      <div className="my-6 h-px bg-line" />
      {children}
    </>
  )
}

function PayPanel({ blocker, applicationLink, onPay }: { blocker: string | null; applicationLink: string; onPay: () => void }) {
  const { t } = useI18n()

  return (
    <PanelIntro>
      <p className="text-[15px] text-ink">
        <Lines text={t('payment.panelHow')} />
      </p>
      {blocker && <p role="status" className="mt-4 rounded-lg bg-amber-wash px-3 py-2.5 text-sm font-medium text-amber-ink">{blocker}</p>}
      <div className="mt-8 flex flex-col gap-4">
        <Button size="lg" onClick={onPay} disabled={blocker !== null} className="w-full">
          {t('payment.submit')} <Arrow />
        </Button>
        <Link to={applicationLink} className={buttonClasses('soft', 'lg', 'w-full')}>
          {t('payment.back')}
        </Link>
      </div>
    </PanelIntro>
  )
}

/** Shown while the simulated payment is being confirmed. */
function Processing() {
  const { t } = useI18n()

  return (
    <div role="status" aria-live="polite">
      <h2 className="mt-3 text-[23px] font-semibold text-ink">{t('payment.processingTitle')}</h2>
      <p className="mt-4 text-base text-muted">
        <Lines text={t('payment.processingBody')} />
      </p>
      <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-sage-200">
        <div className="h-full w-full origin-left animate-progress rounded-full bg-brand" />
      </div>
      <p className="mt-11 text-sm text-muted">
        <Lines text={t('payment.processingNote')} />
      </p>
      <p className="mt-20 flex min-h-[50px] items-center justify-center rounded-lg bg-sage-200 text-[15px] font-semibold text-brand">
        {t('payment.processing')}
      </p>
    </div>
  )
}

/** The application can no longer be paid for: say why, and keep the pay button visibly switched off. */
function ClosedPanel({ status, applicationLink }: { status: Exclude<HoldStatus, 'HELD'>; applicationLink: string }) {
  const { t } = useI18n()

  return (
    <PanelIntro>
      <p role="status" className="rounded-lg bg-amber-wash px-3 py-2.5 text-sm font-medium text-amber-ink">
        {t(`payment.closed.${status}`)}
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <Button size="lg" disabled className="w-full">
          {t('payment.submit')} <Arrow />
        </Button>
        <Link to={applicationLink} className={buttonClasses('soft', 'lg', 'w-full')}>
          {t('payment.backToApplication')}
        </Link>
      </div>
    </PanelIntro>
  )
}
