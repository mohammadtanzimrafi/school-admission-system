import { useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import { useClasses, useCreateClass } from '../api/queries'
import type { ClassSeats } from '../api/types'
import { toAsciiDigits } from '../classes/classInfo'
import { seatStatus } from '../classes/seatStatus'
import { useClassLabel } from '../classes/useClassLabel'
import { MAX_NAME_LENGTH, validateClassForm, type ClassFormErrors } from '../classes/validateClassForm'
import { Button } from '../components/Button'
import { ErrorState, Lines, NoticeBar, PageHeader, SectionHeader, Skeleton } from '../components/Feedback'
import { Field } from '../components/Field'
import { LiveIndicator } from '../components/LiveIndicator'
import { useToast } from '../components/Toasts'
import { ACADEMIC_YEAR } from '../config'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

/** The admin side: seat totals at a glance, every class and shift, and the form to open a new one. */
export function ClassManagementPage() {
  const { t, formatDigits } = useI18n()
  const classes = useClasses()
  useDocumentTitle(t('nav.management'))

  return (
    <>
      <PageHeader
        crumbs={[t('crumb.admin'), t('nav.year', { year: formatDigits(String(ACADEMIC_YEAR)) })]}
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        aside={<LiveIndicator label={t('admin.live')} />}
      />

      <SeatTotals classes={classes.data} />

      <div className="mt-9 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_382px]">
        <section>
          <SectionHeader title={t('admin.tableTitle')} subtitle={t('admin.tableSubtitle')} />
          {classes.isPending ? (
            <Skeleton className="h-[441px]" />
          ) : classes.data === undefined ? (
            <ErrorState title={t('classes.loadError')} error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isFetching} />
          ) : (
            <SeatTable classes={classes.data} />
          )}
        </section>

        <div className="space-y-5">
          <CreateClassForm />
          <p className="rounded-lg bg-sage-200 px-4 py-3 text-[13px] text-brand">
            <Lines text={t('admin.releaseNote')} />
          </p>
        </div>
      </div>
    </>
  )
}

function SeatTotals({ classes }: { classes: ClassSeats[] | undefined }) {
  const { t, formatNumber, formatPercent } = useI18n()
  const sum = (pick: (seats: ClassSeats) => number) => (classes ?? []).reduce((total, seats) => total + pick(seats), 0)
  const total = sum((seats) => seats.totalSeats)
  const confirmed = sum((seats) => seats.confirmedSeats)
  const value = (number: number) => (classes ? formatNumber(number) : '–')

  const cards = [
    { label: t('admin.stat.total'), value: value(total), note: t('admin.stat.totalNote', { count: formatNumber(classes?.length ?? 0) }) },
    { label: t('admin.stat.confirmed'), value: value(confirmed), note: t('admin.stat.confirmedNote', { percent: formatPercent(total ? confirmed / total : 0) }) },
    { label: t('admin.stat.held'), value: value(sum((seats) => seats.heldSeats)), note: t('admin.stat.heldNote') },
    { label: t('admin.stat.available'), value: value(sum((seats) => seats.availableSeats)), note: t('admin.stat.availableNote'), highlight: true },
  ]

  return (
    <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={cn('rounded-xl p-[19px]', card.highlight ? 'bg-zest-soft' : 'border border-line bg-white')}>
          <dt className="text-sm font-medium text-muted">{card.label}</dt>
          <dd className="mt-1 text-[34px] leading-[1.5] font-semibold text-ink tabular">{card.value}</dd>
          <dd className={cn('mt-2 text-[13px]', card.highlight ? 'text-olive' : 'text-muted')}>{card.note}</dd>
        </div>
      ))}
    </dl>
  )
}

const availableTone = {
  open: 'bg-sage-200 text-brand',
  limited: 'bg-amber-tint text-amber-ink',
  full: 'bg-stone-wash text-brand',
}

function SeatTable({ classes }: { classes: ClassSeats[] }) {
  const { t, formatNumber } = useI18n()
  const classLabel = useClassLabel()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => classes.map((seats) => ({ seats, label: classLabel(seats.name) })), [classes, classLabel])
  const needle = toAsciiDigits(query.trim().toLowerCase())
  const visible = needle ? rows.filter(({ seats, label }) => toAsciiDigits(`${seats.name} ${label.full}`.toLowerCase()).includes(needle)) : rows

  return (
    <>
      <label className="relative mb-4 block">
        <span className="sr-only">{t('admin.search')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.search')}
          className="h-[43px] w-full rounded-lg border border-line bg-white pr-12 pl-4 text-[15px] text-ink placeholder:text-muted"
        />
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[23px] leading-none text-muted">
          ⌕
        </span>
      </label>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-sage-100 text-xs text-muted">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">{t('admin.col.class')}</th>
              <th scope="col" className="px-3 py-3.5 font-medium">{t('admin.col.total')}</th>
              <th scope="col" className="px-3 py-3.5 font-medium">{t('admin.col.confirmed')}</th>
              <th scope="col" className="px-3 py-3.5 font-medium">{t('admin.col.held')}</th>
              <th scope="col" className="px-5 py-3.5 font-medium">{t('admin.col.available')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                  {classes.length === 0 ? t('admin.emptyTable') : t('classes.noMatch')}
                </td>
              </tr>
            ) : (
              visible.map(({ seats, label }) => (
                <tr key={seats.id}>
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className="block text-[15px] font-semibold text-ink">{label.title}</span>
                    {label.shift && <span className="block text-[13px] text-muted">{label.shift}</span>}
                  </th>
                  <td className="px-3 py-3 text-[15px] font-medium text-ink tabular">{formatNumber(seats.totalSeats)}</td>
                  <td className="px-3 py-3 text-[15px] text-ink tabular">{formatNumber(seats.confirmedSeats)}</td>
                  <td className="px-3 py-3 text-[15px] text-muted tabular">{formatNumber(seats.heldSeats)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex h-[30px] min-w-[57px] items-center justify-center rounded-[7px] px-2 text-[15px] font-semibold tabular', availableTone[seatStatus(seats)])}>
                      {formatNumber(Math.max(0, seats.availableSeats))}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[13px] text-muted" aria-live="polite">
        {visible.length === rows.length
          ? t('admin.showingAll', { count: formatNumber(rows.length) })
          : t('admin.showingSome', { shown: formatNumber(visible.length), count: formatNumber(rows.length) })}
      </p>
      <p className="mt-2 text-xs text-muted">{t('admin.invariant')}</p>
    </>
  )
}

function CreateClassForm() {
  const { t, describeError } = useI18n()
  const toast = useToast()
  const createClass = useCreateClass()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [seatsText, setSeatsText] = useState('')
  const [errors, setErrors] = useState<ClassFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    setServerError(null)

    const { errors: found, totalSeats } = validateClassForm(name, seatsText)
    setErrors(found)
    if (found.name || found.totalSeats) return

    createClass.mutate(
      { name: name.trim(), totalSeats },
      {
        onSuccess: (created) => {
          toast.success(t('admin.created', { name: created.name }))
          setName('')
          setSeatsText('')
          nameRef.current?.focus()
        },
        onError: (error) => {
          // If the server disagrees with our checks, point at the fields it names.
          const fields = error instanceof ApiError ? (error.details.errors as Record<string, unknown> | undefined) : undefined
          if (fields) {
            setErrors({
              name: fields.name ? 'admin.error.nameRequired' : undefined,
              totalSeats: fields.totalSeats ? 'admin.error.seatsInvalid' : undefined,
            })
          }
          setServerError(describeError(error))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[14px] border border-line bg-white p-[23px]">
      <h2 className="text-[21px] leading-[1.5] font-semibold text-ink">{t('admin.form.title')}</h2>
      <p className="mt-1 text-[15px] text-muted">{t('admin.form.subtitle')}</p>
      <div className="my-5 h-px bg-line" />

      <div className="space-y-6">
        <Field
          label={t('admin.name')}
          inputRef={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('admin.namePlaceholder')}
          maxLength={MAX_NAME_LENGTH + 20}
          help={t('admin.nameHelp')}
          error={errors.name ? t(errors.name) : null}
        />
        <Field
          label={t('admin.seats')}
          value={seatsText}
          onChange={(event) => setSeatsText(event.target.value)}
          placeholder={t('admin.seatsPlaceholder')}
          inputMode="numeric"
          help={t('admin.seatsHelp')}
          error={errors.totalSeats ? t(errors.totalSeats) : null}
        />

        <div className="rounded-[9px] bg-sage-50 px-3.5 py-3">
          <p className="text-sm font-semibold text-ink">{t('admin.shiftNoteTitle')}</p>
          <p className="mt-1 text-[13px] text-muted">
            <Lines text={t('admin.shiftNoteBody')} />
          </p>
        </div>

        {serverError && <NoticeBar tone="rose">{serverError}</NoticeBar>}

        <div>
          <Button type="submit" loading={createClass.isPending} className="w-full justify-start">
            {createClass.isPending ? t('admin.submitting') : <><span aria-hidden>＋</span> {t('admin.submit')}</>}
          </Button>
          <p className="mt-3 text-xs text-muted">{t('admin.visibleNote')}</p>
        </div>
      </div>
    </form>
  )
}
