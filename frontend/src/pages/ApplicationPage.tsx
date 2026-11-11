import { ArrowLeft, Ban, CircleCheck, CreditCard, IdCard, TimerOff } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../api/http'
import { effectiveStatus, useCancelHold, useConfirmHold, useHold, useMyHolds } from '../api/queries'
import type { Hold } from '../api/types'
import { Button, buttonClasses } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CountdownPanel } from '../components/Countdown'
import { ErrorState, Notice, PageHeader, Skeleton } from '../components/Feedback'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toasts'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { useStudent } from '../student/StudentProvider'

export function ApplicationPage() {
  const { holdId = '' } = useParams()
  const { t } = useI18n()
  const hold = useHold(holdId)

  const back = (
    <Link to="/" className="mb-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-800 hover:underline">
      <ArrowLeft className="size-4" aria-hidden />
      {t('application.back')}
    </Link>
  )

  if (hold.isPending) {
    return (
      <div className="mx-auto max-w-2xl" aria-busy="true" aria-label={t('common.loading')}>
        {back}
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (hold.data === undefined) {
    const notFound = hold.error instanceof ApiError && hold.error.status === 404
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <ErrorState
          title={t('application.loadError')}
          error={hold.error}
          onRetry={notFound ? undefined : () => hold.refetch()}
          retrying={hold.isFetching}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {back}
      <PageHeader title={t('application.title')} />
      <ApplicationCard hold={hold.data} />
    </div>
  )
}

function ApplicationCard({ hold }: { hold: Hold }) {
  const { t, describeError } = useI18n()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { studentId, askForStudentId } = useStudent()
  const myHolds = useMyHolds(studentId)
  const confirm = useConfirmHold()
  const cancel = useCancelHold()
  const [askingToCancel, setAskingToCancel] = useState(false)

  const now = useNow(hold.status === 'HELD')
  const status = effectiveStatus(hold, now)
  const remainingMs = Math.max(0, hold.deadline - now)
  const lapsedLocally = hold.status === 'HELD' && status === 'EXPIRED'

  // The moment the countdown reaches zero the page already shows EXPIRED; this asks the
  // server straight away so its answer (and the freed seat) follow without waiting for a poll.
  useEffect(() => {
    if (lapsedLocally) void queryClient.invalidateQueries()
  }, [lapsedLocally, queryClient])

  // Known only once the student's list has loaded; until then we do not block anything.
  const ownedByCurrentStudent = myHolds.data?.some((mine) => mine.holdId === hold.holdId)
  const notOwner = studentId !== null && ownedByCurrentStudent === false
  const busy = confirm.isPending || cancel.isPending

  function pay() {
    if (studentId === null) return askForStudentId()
    confirm.mutate(
      { holdId: hold.holdId, studentId },
      { onSuccess: () => toast.success(t('application.paid')), onError: (error) => toast.error(describeError(error)) },
    )
  }

  function cancelApplication() {
    setAskingToCancel(false)
    if (studentId === null) return askForStudentId()
    cancel.mutate(
      { holdId: hold.holdId, studentId },
      { onSuccess: () => toast.success(t('application.cancelled')), onError: (error) => toast.error(describeError(error)) },
    )
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8" data-testid="application">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{t('application.class')}</p>
          <h2 className="text-xl font-bold text-stone-900">{hold.className ?? hold.classId}</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-6" aria-live="polite">
        {status === 'HELD' && (
          <div className="space-y-5">
            <p className="text-stone-700">{t('application.held.body')}</p>
            <CountdownPanel remainingMs={remainingMs} deadline={hold.deadline} />

            {studentId === null && (
              <Notice tone="warning" icon={<IdCard className="size-5" aria-hidden />}>
                {t('application.needStudent')}
              </Notice>
            )}
            {notOwner && (
              <Notice tone="warning" icon={<IdCard className="size-5" aria-hidden />}>
                {t('application.notOwner')}
              </Notice>
            )}
          </div>
        )}

        {status === 'CONFIRMED' && (
          <Outcome
            icon={<CircleCheck className="size-8" aria-hidden />}
            tone="bg-emerald-100 text-emerald-700"
            title={t('application.confirmed.title')}
            body={t('application.confirmed.body')}
          />
        )}
        {status === 'EXPIRED' && (
          <Outcome
            icon={<TimerOff className="size-8" aria-hidden />}
            tone="bg-stone-200 text-stone-600"
            title={t('application.expired.title')}
            body={t('application.expired.body')}
          />
        )}
        {status === 'CANCELLED' && (
          <Outcome
            icon={<Ban className="size-8" aria-hidden />}
            tone="bg-rose-100 text-rose-700"
            title={t('application.cancelled.title')}
            body={t('application.cancelled.body')}
          />
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {/* The pay button stays on screen in every state so it visibly switches off when time runs out. */}
        {(status === 'HELD' || status === 'EXPIRED') && (
          <Button
            size="lg"
            onClick={pay}
            loading={confirm.isPending}
            disabled={status !== 'HELD' || busy || notOwner}
            icon={<CreditCard className="size-5" aria-hidden />}
            className="flex-1"
          >
            {confirm.isPending ? t('application.paying') : t('application.pay')}
          </Button>
        )}
        {status === 'HELD' && (
          <Button size="lg" variant="danger" onClick={() => setAskingToCancel(true)} loading={cancel.isPending} disabled={busy || notOwner}>
            {cancel.isPending ? t('application.cancelling') : t('application.cancel')}
          </Button>
        )}
        {(status === 'EXPIRED' || status === 'CANCELLED') && (
          <Link to="/" className={buttonClasses('secondary', 'lg', 'flex-1')}>
            {t('application.reapply')}
          </Link>
        )}
        {status === 'CONFIRMED' && (
          <Link to="/applications" className={buttonClasses('secondary', 'lg', 'flex-1')}>
            {t('application.seeAll')}
          </Link>
        )}
      </div>

      <ConfirmDialog
        open={askingToCancel && status === 'HELD'}
        title={t('cancelDialog.title')}
        body={t('cancelDialog.body')}
        confirmLabel={t('cancelDialog.confirm')}
        dismissLabel={t('cancelDialog.dismiss')}
        onConfirm={cancelApplication}
        onDismiss={() => setAskingToCancel(false)}
      />
    </article>
  )
}

function Outcome({ icon, tone, title, body }: { icon: ReactNode; tone: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-stone-50 px-6 py-8 text-center">
      <span className={`flex size-16 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <h3 className="mt-4 text-xl font-bold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-md text-stone-600">{body}</p>
    </div>
  )
}
