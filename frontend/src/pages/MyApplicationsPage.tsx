import { ClipboardList, IdCard } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { AdmissionGuide } from '../applications/AdmissionGuide'
import { ApplicationCard } from '../applications/ApplicationCard'
import { ApplicationHistory } from '../applications/ApplicationHistory'
import { HoldGate } from '../applications/HoldGate'
import { pendingDeadlines, pickFeaturedHold } from '../applications/holdDisplay'
import { useApply } from '../applications/useApply'
import { useHoldOwnership, useHoldStatus } from '../applications/useHoldState'
import { useMyHolds } from '../api/queries'
import type { Hold, HoldStatus } from '../api/types'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow, Button, buttonClasses } from '../components/Button'
import { EmptyState, ErrorState, NoticeBar, PageHeader, Skeleton } from '../components/Feedback'
import { useDeadlineClock } from '../hooks/useDeadlineClock'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'
import { useStudent } from '../student/StudentProvider'

/**
 * "My applications": one application in focus with its countdown or outcome, then every
 * other application. The address picks the one in focus (/applications/:holdId); without
 * one it is the unpaid application, else the latest.
 */
export function MyApplicationsPage() {
  const { holdId } = useParams()
  const { t } = useI18n()
  useDocumentTitle(t('nav.applications'))

  return holdId ? <OneApplication holdId={holdId} /> : <AllApplications />
}

function Header() {
  const { t } = useI18n()

  return (
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
}

function OverviewSkeleton() {
  const { t } = useI18n()

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_382px]" aria-busy="true" aria-label={t('common.loading')}>
      <Skeleton className="h-[372px]" />
      <Skeleton className="h-[372px]" />
    </div>
  )
}

/** Opened from a link: shows that application even without (or with another) student number. */
function OneApplication({ holdId }: { holdId: string }) {
  const { studentId } = useStudent()
  const mine = useMyHolds(studentId).data ?? []

  return (
    <HoldGate holdId={holdId} header={<Header />} skeleton={<OverviewSkeleton />}>
      {(featured) => <Overview featured={featured} holds={mine} />}
    </HoldGate>
  )
}

function AllApplications() {
  const { t } = useI18n()
  const { studentId, askForStudentId } = useStudent()
  const holds = useMyHolds(studentId)
  const now = useDeadlineClock(pendingDeadlines(holds.data ?? []))

  if (studentId === null) {
    return (
      <>
        <Header />
        <EmptyState
          icon={<IdCard className="size-7" aria-hidden />}
          title={t('my.needStudent.title')}
          body={t('my.needStudent.body')}
          action={<Button onClick={askForStudentId}>{t('my.needStudent.action')}</Button>}
        />
      </>
    )
  }

  if (holds.data === undefined) {
    return (
      <>
        <Header />
        {holds.isPending ? (
          <OverviewSkeleton />
        ) : (
          <ErrorState title={t('my.loadError')} error={holds.error} onRetry={() => holds.refetch()} retrying={holds.isFetching} />
        )}
      </>
    )
  }

  const featured = pickFeaturedHold(holds.data, now)
  if (!featured) {
    return (
      <>
        <Header />
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

  return <Overview featured={featured} holds={holds.data} />
}

const noticeTone: Record<HoldStatus, 'amber' | 'green' | 'stone'> = {
  HELD: 'amber',
  CONFIRMED: 'green',
  CANCELLED: 'stone',
  EXPIRED: 'amber',
}

function Overview({ featured, holds }: { featured: Hold; holds: Hold[] }) {
  const { t, locale } = useI18n()
  const classLabel = useClassLabel()
  const status = useHoldStatus(featured) ?? featured.status
  const { ownerId, blocker } = useHoldOwnership(featured.holdId)
  const { apply, applyingTo } = useApply()

  const others = holds.filter((hold) => hold.holdId !== featured.holdId)
  const now = useDeadlineClock(pendingDeadlines(others))
  const label = classLabel(featured.className ?? featured.classId)

  return (
    <>
      <Header />

      <NoticeBar tone={noticeTone[status]} icon={status === 'HELD' ? '◷' : undefined}>
        {status === 'HELD' ? t('my.notice.HELD', { className: inClass(label.title, locale) }) : t(`my.notice.${status}`)}
      </NoticeBar>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_382px]">
        <ApplicationCard
          hold={featured}
          status={status}
          ownerId={ownerId}
          blocker={blocker ? t(blocker) : undefined}
          onReapply={() => apply(featured.classId)}
          reapplying={applyingTo === featured.classId}
        />
        <AdmissionGuide status={status} classLine={label.shift ? `${label.title} · ${label.shift}` : label.title} />
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
