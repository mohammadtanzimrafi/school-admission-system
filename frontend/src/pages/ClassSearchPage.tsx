import { School } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useApply } from '../applications/useApply'
import { effectiveStatus, useClasses, useMyHolds } from '../api/queries'
import type { Hold } from '../api/types'
import searchIcon from '../assets/icons/search.svg'
import { ClassCard } from '../classes/ClassCard'
import { toAsciiDigits } from '../classes/classInfo'
import { HowItWorks } from '../classes/HowItWorks'
import { useClassLabel } from '../classes/useClassLabel'
import { buttonClasses } from '../components/Button'
import { EmptyState, ErrorState, PageHeader, SectionHeader, Skeleton } from '../components/Feedback'
import { LiveIndicator } from '../components/LiveIndicator'
import { Pill } from '../components/StatusPill'
import { ACADEMIC_YEAR, REFRESH_INTERVAL } from '../config'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { useStudent } from '../student/StudentProvider'

export function ClassSearchPage() {
  const { t, formatDigits, formatNumber } = useI18n()
  const classes = useClasses()
  const { studentId } = useStudent()
  const myHolds = useMyHolds(studentId)
  const { apply, busy, applyingTo } = useApply()
  const classLabel = useClassLabel()
  const { hash } = useLocation()

  const [query, setQuery] = useState('')
  const [shift, setShift] = useState('')
  const [grade, setGrade] = useState('')
  const now = useNow((myHolds.data ?? []).some((hold) => hold.status === 'HELD'))

  // The sidebar's "help" link points at the explainer on this page.
  useEffect(() => {
    if (hash === '#how-it-works') document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  // The student's seat-occupying application per class, so its card offers "view" instead of "apply".
  const ownByClass = useMemo(() => {
    const own = new Map<string, Hold>()
    for (const hold of myHolds.data ?? []) {
      const status = effectiveStatus(hold, now)
      if (status === 'HELD' || status === 'CONFIRMED') own.set(hold.classId, hold)
    }
    return own
  }, [myHolds.data, now])

  const labelled = useMemo(
    () => (classes.data ?? []).map((seats) => ({ seats, label: classLabel(seats.name) })),
    [classes.data, classLabel],
  )
  const shiftOptions = unique(labelled.map(({ label }) => label.shift).filter(Boolean))
  const gradeOptions = unique(
    [...labelled].sort((a, b) => (a.label.grade ?? Infinity) - (b.label.grade ?? Infinity)).map(({ label }) => label.title),
  )

  const needle = toAsciiDigits(query.trim().toLowerCase())
  const visible = labelled.filter(
    ({ seats, label }) =>
      (!shift || label.shift === shift) &&
      (!grade || label.title === grade) &&
      (!needle || toAsciiDigits(`${seats.name} ${label.full}`.toLowerCase()).includes(needle)),
  )

  function clearFilters() {
    setQuery('')
    setShift('')
    setGrade('')
  }

  return (
    <>
      <PageHeader
        crumbs={[t('crumb.admissions'), formatDigits(String(ACADEMIC_YEAR))]}
        title={t('classes.title')}
        subtitle={t('classes.subtitle')}
        aside={
          <Pill tone="lime" dot className="px-4 py-1.5">
            {t('classes.open')}
          </Pill>
        }
      />

      <HowItWorks />

      <section className="mt-8">
        <SectionHeader
          title={t('classes.sectionTitle')}
          subtitle={classes.data ? t('classes.count', { count: formatNumber(classes.data.length) }) : undefined}
          aside={<LiveIndicator label={t('classes.live', { seconds: formatNumber(REFRESH_INTERVAL.classes / 1000) })} />}
        />

        {classes.isPending ? (
          <div className="grid gap-[19px] sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label={t('common.loading')}>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[242px]" />
            ))}
          </div>
        ) : classes.data === undefined ? (
          <ErrorState title={t('classes.loadError')} error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isFetching} />
        ) : classes.data.length === 0 ? (
          <EmptyState
            icon={<School className="size-7" aria-hidden />}
            title={t('classes.empty.title')}
            body={t('classes.empty.body')}
            action={
              <Link to="/admin/classes" className={buttonClasses('primary')}>
                {t('classes.empty.action')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label className="relative w-full md:w-[580px] md:max-w-full">
                <span className="sr-only">{t('classes.search')}</span>
                <img src={searchIcon} width={20} height={20} alt="" className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('classes.search')}
                  className="h-11 w-full rounded-lg border border-line bg-white pr-4 pl-[43px] text-[15px] text-ink placeholder:text-muted"
                />
              </label>
              <FilterSelect label={t('classes.shiftFilter')} allLabel={t('classes.allShifts')} value={shift} options={shiftOptions} onChange={setShift} />
              <FilterSelect label={t('classes.gradeFilter')} allLabel={t('classes.allGrades')} value={grade} options={gradeOptions} onChange={setGrade} />
              <p className="ml-auto text-[13px] text-muted" aria-live="polite">
                {t('classes.showing', { count: formatNumber(visible.length) })}
              </p>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-white px-6 py-10 text-center">
                <p className="text-muted">{t('classes.noMatch')}</p>
                <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-brand hover:underline">
                  {t('classes.clearFilters')}
                </button>
              </div>
            ) : (
              <ul className="grid gap-[19px] sm:grid-cols-2 xl:grid-cols-3">
                {visible.map(({ seats, label }) => (
                  <li key={seats.id}>
                    <ClassCard
                      seats={seats}
                      label={label}
                      ownHold={ownByClass.get(seats.id)}
                      applying={applyingTo === seats.id}
                      busy={busy}
                      onApply={() => apply(seats.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <p className="mt-7 text-[13px] text-muted">{t('classes.footer')}</p>
    </>
  )
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

interface FilterSelectProps {
  label: string
  allLabel: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

/** A plain select dressed as the design's "সব শিফট ⌄" box. */
function FilterSelect({ label, allLabel, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[142px] appearance-none rounded-[7px] bg-white pr-9 pl-3.5 text-[15px] font-semibold text-ink ring-1 ring-line"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-[60%] text-ink">
        ⌄
      </span>
    </label>
  )
}
