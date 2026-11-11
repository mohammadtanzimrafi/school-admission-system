import { ArrowRight, School, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/http'
import { effectiveStatus, useClasses, useMyHolds, usePlaceHold } from '../api/queries'
import type { ClassSeats, Hold } from '../api/types'
import { Button, buttonClasses } from '../components/Button'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/Feedback'
import { SeatMeter } from '../components/SeatMeter'
import { useToast } from '../components/Toasts'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useServerReachable } from '../lib/connection'
import { useStudent } from '../student/StudentProvider'

const SEARCH_FROM_COUNT = 7

export function ClassListPage() {
  const { t, describeError } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { studentId, askForStudentId } = useStudent()
  const classes = useClasses()
  const myHolds = useMyHolds(studentId)
  const placeHold = usePlaceHold()
  const [query, setQuery] = useState('')
  const now = useNow((myHolds.data ?? []).some((hold) => hold.status === 'HELD'))

  // The student's seat-occupying application per class, to offer "view" instead of "apply".
  const ownByClass = useMemo(() => {
    const map = new Map<string, Hold>()
    for (const hold of myHolds.data ?? []) {
      const status = effectiveStatus(hold, now)
      if (status === 'HELD' || status === 'CONFIRMED') map.set(hold.classId, hold)
    }
    return map
  }, [myHolds.data, now])

  function apply(seats: ClassSeats) {
    if (studentId === null) {
      askForStudentId()
      return
    }

    placeHold.mutate(
      { classId: seats.id, studentId },
      {
        onSuccess: (hold) => {
          toast.success(t('apply.success'))
          navigate(`/applications/${hold.holdId}`)
        },
        onError: (error) => {
          const existing = error instanceof ApiError && error.code === 'ALREADY_APPLIED' ? error.details.holdId : null
          if (typeof existing === 'string') {
            // Already applied (perhaps in another tab): take them to that application.
            toast.info(t('error.ALREADY_APPLIED'))
            navigate(`/applications/${existing}`)
            return
          }
          toast.error(describeError(error))
        },
      },
    )
  }

  const header = <PageHeader title={t('classes.title')} subtitle={t('classes.subtitle')} aside={<LiveIndicator />} />


  if (classes.isPending) {
    return (
      <>
        {header}
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label={t('common.loading')}>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  if (classes.isError && classes.data === undefined) {
    return (
      <>
        {header}
        <ErrorState title={t('classes.loadError')} error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isFetching} />
      </>
    )
  }

  const all = classes.data ?? []
  if (all.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<School className="size-7" aria-hidden />}
          title={t('classes.empty.title')}
          body={t('classes.empty.body')}
          action={
            <Link to="/admin/classes/new" className={buttonClasses('primary')}>
              {t('classes.empty.action')}
            </Link>
          }
        />
      </>
    )
  }

  const needle = query.trim().toLowerCase()
  const visible = needle ? all.filter((seats) => seats.name.toLowerCase().includes(needle)) : all

  return (
    <>
      {header}

      {all.length >= SEARCH_FROM_COUNT && (
        <label className="relative mb-5 block">
          <span className="sr-only">{t('classes.search')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('classes.search')}
            className="min-h-11 w-full rounded-xl border border-stone-300 bg-white pr-4 pl-12 text-base placeholder:text-stone-400"
          />
        </label>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-600">
          {t('classes.noMatch', { query: query.trim() })}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((seats) => (
            <li key={seats.id}>
              <ClassCard
                seats={seats}
                ownHold={ownByClass.get(seats.id)}
                applying={placeHold.isPending && placeHold.variables?.classId === seats.id}
                busy={placeHold.isPending}
                onApply={() => apply(seats)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Says whether the seat numbers on screen are live, or the last known ones while the server is away. */
function LiveIndicator() {
  const { t } = useI18n()
  const live = useServerReachable()

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        live ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700',
      )}
    >
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
        <span className={cn('relative inline-flex size-2 rounded-full', live ? 'bg-emerald-600' : 'bg-stone-500')} />
      </span>
      {live ? t('classes.live') : t('classes.reconnecting')}
    </span>
  )
}

interface ClassCardProps {
  seats: ClassSeats
  ownHold?: Hold
  applying: boolean
  busy: boolean
  onApply: () => void
}

export function ClassCard({ seats, ownHold, applying, busy, onApply }: ClassCardProps) {
  const { t, formatNumber } = useI18n()
  const full = seats.availableSeats <= 0

  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-stone-900">{seats.name}</h2>

      <p className={cn('mt-1 text-2xl font-bold', full ? 'text-rose-700' : 'text-teal-700')} data-testid="availability">
        {full
          ? t('seats.full')
          : t(seats.availableSeats === 1 ? 'seats.availableOne' : 'seats.available', { count: formatNumber(seats.availableSeats) })}
      </p>

      <div className="mt-4">
        <SeatMeter seats={seats} />
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-end gap-2">
        {ownHold ? (
          <>
            <p className="text-sm font-medium text-teal-800">
              {t(ownHold.status === 'CONFIRMED' ? 'apply.confirmedNote' : 'apply.activeNote')}
            </p>
            <Link to={`/applications/${ownHold.holdId}`} className={buttonClasses('secondary', 'md', 'w-full')}>
              {t('apply.view')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </>
        ) : (
          <Button onClick={onApply} loading={applying} disabled={full || busy} className="w-full">
            {applying ? t('apply.pending') : full ? t('seats.full') : t('apply.action')}
          </Button>
        )}
      </div>
    </article>
  )
}
