import { Link, useNavigate, useParams } from 'react-router'
import { HoldGate } from '../applications/HoldGate'
import { useHoldOwnership, useHoldStatus } from '../applications/useHoldState'
import { useCancelHold } from '../api/queries'
import type { Hold } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Button, buttonClasses } from '../components/Button'
import { Countdown } from '../components/Countdown'
import { Lines, PageHeader, Skeleton } from '../components/Feedback'
import { useToast } from '../components/Toasts'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'

/** "Are you sure?" as a page of its own, with the countdown still running in the corner. */
export function CancelPage() {
  const { holdId = '' } = useParams()
  const { t } = useI18n()
  useDocumentTitle(t('crumb.cancel'))

  const crumbs = [t('crumb.admissions'), t('crumb.cancel')]

  return (
    <HoldGate
      holdId={holdId}
      header={<PageHeader crumbs={crumbs} title={t('cancel.title')} />}
      skeleton={<Skeleton className="mx-auto h-[498px] max-w-[704px]" />}
    >
      {(hold) => <CancelConfirmation hold={hold} crumbs={crumbs} />}
    </HoldGate>
  )
}

function CancelConfirmation({ hold, crumbs }: { hold: Hold; crumbs: string[] }) {
  const { t, describeError } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const status = useHoldStatus(hold) ?? hold.status
  const { studentId, blocker } = useHoldOwnership(hold.holdId)
  const cancel = useCancelHold()
  const className = useClassLabel()(hold.className ?? hold.classId).full
  const applicationLink = `/applications/${hold.holdId}`
  const held = status === 'HELD'

  function confirmCancel() {
    if (studentId === null) return
    cancel.mutate(
      { holdId: hold.holdId, studentId },
      {
        onSuccess: () => {
          toast.success(t('cancel.done'))
          navigate(applicationLink, { replace: true })
        },
        onError: (error) => toast.error(describeError(error)),
      },
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-[13px] font-semibold text-muted">{crumbs.join('  /  ')}</p>
        {held && <Countdown deadline={hold.deadline} label={t('payment.timeLeft')} className="sm:mr-5" />}
      </div>

      <section className="mx-auto mt-6 max-w-[704px] rounded-2xl border border-line bg-white p-6 sm:p-8">
        <span aria-hidden className="flex size-[52px] items-center justify-center rounded-full bg-amber-wash text-[27px] font-semibold text-amber-ink">
          !
        </span>
        <h1 className="mt-7 text-[28px] leading-[1.6] font-semibold text-ink">{t('cancel.title')}</h1>
        <p className="mt-2 text-lg font-medium text-ink">{className}</p>
        <p className="mt-4 text-base leading-[1.6] text-muted">
          <Lines text={held ? t('cancel.body') : t('cancel.closed')} />
        </p>
        {held && blocker && <p role="status" className="mt-4 rounded-lg bg-amber-wash px-3 py-2.5 text-sm font-medium text-amber-ink">{t(blocker)}</p>}

        <div className="my-8 h-px bg-line" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Link to={applicationLink} className={buttonClasses('primary', 'lg', 'w-full')}>
            {held ? t('cancel.keep') : t('payment.backToApplication')}
          </Link>
          {held && (
            <Button size="lg" variant="danger" onClick={confirmCancel} loading={cancel.isPending} disabled={blocker !== null} className="w-full">
              {cancel.isPending ? t('cancel.cancelling') : t('cancel.confirm')}
            </Button>
          )}
        </div>
        <p className="mt-7 text-sm text-muted">{t('cancel.noCharge')}</p>
      </section>
    </>
  )
}
