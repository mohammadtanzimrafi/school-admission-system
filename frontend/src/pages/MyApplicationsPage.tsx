import { ArrowRight, ClipboardList, IdCard } from 'lucide-react'
import { Link } from 'react-router'
import { effectiveStatus, useMyHolds } from '../api/queries'
import type { Hold } from '../api/types'
import { Button, buttonClasses } from '../components/Button'
import { CountdownChip } from '../components/Countdown'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/Feedback'
import { StatusBadge } from '../components/StatusBadge'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useStudent } from '../student/StudentProvider'

export function MyApplicationsPage() {
  const { t } = useI18n()
  const { studentId, askForStudentId } = useStudent()
  const holds = useMyHolds(studentId)
  const now = useNow((holds.data ?? []).some((hold) => hold.status === 'HELD'))

  const header = <PageHeader title={t('my.title')} subtitle={t('my.subtitle')} />

  if (studentId === null) {
    return (
      <>
        {header}
        <EmptyState
          icon={<IdCard className="size-7" aria-hidden />}
          title={t('my.needStudent.title')}
          body={t('my.needStudent.body')}
          action={<Button onClick={askForStudentId}>{t('student.label')}</Button>}
        />
      </>
    )
  }

  if (holds.isPending) {
    return (
      <>
        {header}
        <div className="space-y-3" aria-busy="true" aria-label={t('common.loading')}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  if (holds.data === undefined) {
    return (
      <>
        {header}
        <ErrorState title={t('my.loadError')} error={holds.error} onRetry={() => holds.refetch()} retrying={holds.isFetching} />
      </>
    )
  }

  if (holds.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<ClipboardList className="size-7" aria-hidden />}
          title={t('my.empty.title')}
          body={t('my.empty.body')}
          action={
            <Link to="/" className={buttonClasses('primary')}>
              {t('my.empty.action')}
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      {header}
      <ul className="space-y-3">
        {holds.data.map((hold) => (
          <li key={hold.holdId}>
            <ApplicationRow hold={hold} now={now} />
          </li>
        ))}
      </ul>
    </>
  )
}

function ApplicationRow({ hold, now }: { hold: Hold; now: number }) {
  const { t } = useI18n()
  const status = effectiveStatus(hold, now)
  const pending = status === 'HELD'

  return (
    <article
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5',
        pending ? 'border-amber-300' : 'border-stone-200',
      )}
    >
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="truncate text-lg font-bold text-stone-900">{hold.className ?? hold.classId}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {pending && <CountdownChip remainingMs={hold.deadline - now} />}
        </div>
      </div>

      <Link
        to={`/applications/${hold.holdId}`}
        className={buttonClasses(pending ? 'primary' : 'secondary', 'md', 'w-full sm:w-auto')}
      >
        {pending ? t('my.payNow') : t('my.details')}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  )
}
