import { CirclePlus } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/http'
import { useClasses, useCreateClass } from '../api/queries'
import { Button } from '../components/Button'
import { Notice, PageHeader } from '../components/Feedback'
import { useToast } from '../components/Toasts'
import { useI18n } from '../i18n/I18nProvider'
import type { MessageKey } from '../i18n/messages'
import { cn } from '../lib/cn'
import { normalizeStudentId } from '../student/studentId'

const MAX_NAME_LENGTH = 100
const MAX_TOTAL_SEATS = 100_000

type FieldErrors = { name?: MessageKey; totalSeats?: MessageKey }

/** Same rules as the backend, checked here first so mistakes are caught before a round trip. */
export function validateClassForm(name: string, seatsText: string): { errors: FieldErrors; totalSeats: number } {
  const errors: FieldErrors = {}
  const trimmed = name.trim()
  if (trimmed.length === 0) errors.name = 'admin.error.nameRequired'
  else if (trimmed.length > MAX_NAME_LENGTH) errors.name = 'admin.error.nameTooLong'

  // Accept Bangla digits here too; reuse the same normaliser as the student id.
  const digits = normalizeStudentId(seatsText)
  const totalSeats = Number(digits)
  if (digits.length === 0) errors.totalSeats = 'admin.error.seatsRequired'
  else if (!/^\d+$/.test(digits) || totalSeats < 1 || totalSeats > MAX_TOTAL_SEATS) errors.totalSeats = 'admin.error.seatsInvalid'

  return { errors, totalSeats }
}

export function CreateClassPage() {
  const { t, formatNumber, describeError } = useI18n()
  const toast = useToast()
  const createClass = useCreateClass()
  const classes = useClasses()
  const nameId = useId()
  const seatsId = useId()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [seatsText, setSeatsText] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
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
          // If the server disagrees with our validation, point at the fields it names.
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

  const inputClasses = (invalid: boolean) =>
    cn(
      'mt-1.5 min-h-11 w-full rounded-xl border bg-white px-4 text-base text-stone-900 placeholder:text-stone-400',
      invalid ? 'border-rose-400' : 'border-stone-300',
    )

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <form onSubmit={submit} noValidate className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-5">
          <div>
            <label htmlFor={nameId} className="text-sm font-semibold text-stone-800">
              {t('admin.name')}
            </label>
            <input
              id={nameId}
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('admin.namePlaceholder')}
              maxLength={MAX_NAME_LENGTH + 20}
              autoComplete="off"
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              className={inputClasses(errors.name !== undefined)}
            />
            {errors.name && (
              <p id={`${nameId}-error`} role="alert" className="mt-1.5 text-sm font-medium text-rose-700">
                {t(errors.name)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={seatsId} className="text-sm font-semibold text-stone-800">
              {t('admin.seats')}
            </label>
            <input
              id={seatsId}
              value={seatsText}
              onChange={(event) => setSeatsText(event.target.value)}
              placeholder={t('admin.seatsPlaceholder')}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.totalSeats !== undefined}
              aria-describedby={errors.totalSeats ? `${seatsId}-error` : undefined}
              className={cn(inputClasses(errors.totalSeats !== undefined), 'sm:max-w-48')}
            />
            {errors.totalSeats && (
              <p id={`${seatsId}-error`} role="alert" className="mt-1.5 text-sm font-medium text-rose-700">
                {t(errors.totalSeats)}
              </p>
            )}
          </div>

          {serverError && <Notice tone="error">{serverError}</Notice>}

          <Button type="submit" size="lg" loading={createClass.isPending} icon={<CirclePlus className="size-5" aria-hidden />} className="w-full sm:w-auto">
            {createClass.isPending ? t('admin.submitting') : t('admin.submit')}
          </Button>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-stone-900">{t('admin.existing')}</h2>
        {classes.data === undefined || classes.data.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center text-stone-600">
            {classes.isError ? describeError(classes.error) : classes.isPending ? t('common.loading') : t('admin.existingEmpty')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.name')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('seats.total')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('seats.confirmed')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('seats.held')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('seats.free')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {classes.data.map((seats) => (
                  <tr key={seats.id}>
                    <th scope="row" className="px-4 py-3 font-semibold text-stone-900">{seats.name}</th>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(seats.totalSeats)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(seats.confirmedSeats)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(seats.heldSeats)}</td>
                    <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', seats.availableSeats > 0 ? 'text-teal-700' : 'text-rose-700')}>
                      {formatNumber(seats.availableSeats)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
