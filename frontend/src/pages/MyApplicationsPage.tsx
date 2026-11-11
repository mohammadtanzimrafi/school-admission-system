import { ClipboardList, IdCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { AdmissionGuide } from '../applications/AdmissionGuide'
import { ApplicationCard } from '../applications/ApplicationCard'
import { ApplicationHistory } from '../applications/ApplicationHistory'
import { pickFeaturedHold } from '../applications/holdDisplay'
import { useApply } from '../applications/useApply'
import { useHoldOwnership, useLiveHold } from '../applications/useHoldState'
import { ApiError } from '../api/http'
import { useHold, useMyHolds } from '../api/queries'
import type { Hold, HoldStatus } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow, Button, buttonClasses } from '../components/Button'
import { EmptyState, ErrorState, NoticeBar, PageHeader, Skeleton } from '../components/Feedback'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { useStudent } from '../student/StudentProvider'

/**
 * "My applications": one application in focus (the one in the address, else the unpaid
 * one, else the latest) with its countdown or outcome, then every other application.
 */
export function MyApplicationsPage() {
  const { holdId } = useParams()
  const { t } = useI18n()
  const { studentId, askForStudentId } = useStudent()
  const myHolds = useMyHolds(studentId)
  const requested = useHold(holdId)
  const now = useNow((myHolds.data ?? []).some((hold) => hold.status === 'HELD'))

  const header = (
    <PageHeader
      crumbs={[t('crumb.admissions'), t('crumb.applications')]}
      title={t('my.title')}
      subtitle={t('my.subtitle')}
      aside={
        <Link to="/" className={buttonClasses('white', 'md', 'w-[178px] justify-start')}>
          {t('my.browse')} <Arrow />
        </Link>
      }
    />
  )

  // Opened from a link: show that application even without (or with another) student number.
  if (holdId) {
    if (requested.isPending) return <Loading header={header} />
    if (requested.data === undefined) {
      const missing = requested.error instanceof ApiError && requested.error.status === 404
      return (
        <>
          {header}
          <ErrorState
            title={missing ? t('my.notFound') : t('my.loadError')}
            error={requested.error}
            onRetry={missing ? undefined : () => requested.refetch()}
            retrying={requested.isFetching}
          />
        </>
      )
    }
    return <Overview header={header} featured={requested.data} others={(myHolds.data ?? []).filter((hold) => hold.holdId !== holdId)} now={now} />
  }

  if (studentId === null) {
    return (
      <>
        {header}
        <EmptyState
          icon={<IdCard className="size-7" aria-hidden />}
          title={t('my.needStudent.title')}
          body={t('my.needStudent.body')}
          action={<Button onClick={askForStudentId}>{t('my.needStudent.action')}</Button>}
        />
      </>
    )
  }

  if (myHolds.isPending) return <Loading header={header} />
  if (myHolds.data === undefined) {
    return (
      <>
        {header}
        <ErrorState title={t('my.loadError')} error={myHolds.error} onRetry={() => myHolds.refetch()} retrying={myHolds.isFetching} />
      </>
    )
  }

  const featured = pickFeaturedHold(myHolds.data, undefined, now)
  if (!featured) {
    return (
      <>
        {header}
        <EmptyState
          icon={<ClipboardList className="size-7" aria-hidden />}
          title={t('my.empty.title')}
          body={t('my.empty.body')}
          action={
            <Link to="/" className={buttonClasses('primary')}>
              {t('my.browse')} <Arrow />
            </Link>
          }
        />
      </>
    )
  }

  return <Overview header={header} featured={featured} others={myHolds.data.filter((hold) => hold.holdId !== featured.holdId)} now={now} />
}

const noticeTone: Record<HoldStatus, 'amber' | 'green' | 'stone'> = {
  HELD: 'amber',
  CONFIRMED: 'green',
  CANCELLED: 'stone',
  EXPIRED: 'amber',
}

function Overview({ header, featured, others, now }: { header: ReactNode; featured: Hold; others: Hold[]; now: number }) {
  const { t, locale } = useI18n()
  const classLabel = useClassLabel()
  const { status = featured.status, remainingMs } = useLiveHold(featured)
  const { ownerId, blocker } = useHoldOwnership(featured.holdId)
  const { apply, applyingTo } = useApply()

  const label = classLabel(featured.className ?? featured.classId)
  const classLine = label.shift ? `${label.title} · ${label.shift}` : label.title

  return (
    <>
      {header}

      <NoticeBar tone={noticeTone[status]} icon={status === 'HELD' ? '◷' : undefined}>
        {status === 'HELD' ? t('my.notice.HELD', { className: inClass(label.title, locale) }) : t(`my.notice.${status}`)}
      </NoticeBar>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_382px]">
        <ApplicationCard
          hold={featured}
          status={status}
          remainingMs={remainingMs}
          ownerId={ownerId}
          blocker={blocker ? t(blocker) : undefined}
          onReapply={() => apply(featured.classId)}
          reapplying={applyingTo === featured.classId}
        />
        <AdmissionGuide status={status} classLine={classLine} />
      </div>

      <ApplicationHistory holds={others} now={now} onReapply={apply} reapplyingTo={applyingTo} />

      <p className="mt-5 text-[13px] text-muted">{t('my.footer')}</p>
    </>
  )
}

/** "in Class 6": Bangla joins -তে straight onto a Bangla word ("ষষ্ঠ শ্রেণিতে") and with a hyphen after Latin text. */
function inClass(title: string, locale: string): string {
  if (locale === 'en') return `in ${title}`
  return /[ঀ-৿]$/.test(title) ? `${title}তে` : `${title}-তে`
}

function Loading({ header }: { header: ReactNode }) {
  const { t } = useI18n()

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_382px]" aria-busy="true" aria-label={t('common.loading')}>
        <Skeleton className="h-[372px]" />
        <Skeleton className="h-[372px]" />
      </div>
    </>
  )
}
