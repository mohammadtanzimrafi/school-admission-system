import { IdCard, Pencil } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { useToast } from '../components/Toasts'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useStudent } from './StudentProvider'
import { checkStudentId, formatStudentId, normalizeStudentId, STUDENT_ID_LENGTH } from './studentId'

/**
 * The box at the top of every page where the student's birth registration number is
 * entered. Once saved it shrinks to a one-line summary with a "change" button.
 */
export function StudentBar() {
  const { t, formatNumber } = useI18n()
  const toast = useToast()
  const { studentId, setStudentId, inputRef, askCount } = useStudent()
  const inputId = useId()
  const messageId = useId()

  const [wantsToEdit, setWantsToEdit] = useState(false)
  const [answeredAsk, setAnsweredAsk] = useState(askCount)
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  // Another screen asked for the number ("enter it before applying") and it has not been dealt with yet.
  const nudged = askCount > answeredAsk
  const editing = studentId === null || wantsToEdit || nudged
  const digits = normalizeStudentId(draft)

  useEffect(() => {
    if (!nudged) return
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [nudged, askCount, inputRef])

  function startEditing() {
    setDraft('')
    setProblem(null)
    setWantsToEdit(true)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  function stopEditing() {
    setWantsToEdit(false)
    setAnsweredAsk(askCount)
    setProblem(null)
    setDraft('')
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const issue = checkStudentId(digits)
    if (issue !== null) {
      setProblem(
        issue === 'empty'
          ? t('student.error.empty')
          : issue === 'not-digits'
            ? t('student.error.notDigits')
            : t('student.error.wrongLength', { count: formatNumber(digits.length) }),
      )
      inputRef.current?.focus()
      return
    }

    setStudentId(digits)
    stopEditing()
    toast.success(t('student.saved'))
  }

  if (!editing) {
    return (
      <section aria-label={t('student.label')} className="border-b border-teal-100 bg-teal-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6">
          <IdCard className="size-5 shrink-0 text-teal-700" aria-hidden />
          <span className="text-sm text-teal-900">{t('student.current')}:</span>
          <span className="font-mono text-base font-semibold tracking-wide text-teal-950" data-testid="current-student-id">
            {formatStudentId(studentId)}
          </span>
          <Button variant="ghost" size="sm" onClick={startEditing} icon={<Pencil className="size-3.5" aria-hidden />} className="ml-auto">
            {t('student.change')}
          </Button>
        </div>
      </section>
    )
  }

  const message = problem ?? (nudged ? t('student.required') : t('student.help'))

  return (
    <section aria-label={t('student.label')} className={cn('border-b', nudged && !problem ? 'border-amber-300 bg-amber-50' : 'border-teal-100 bg-teal-50')}>
      <form onSubmit={save} noValidate className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold text-teal-950">
          <IdCard className="size-5 text-teal-700" aria-hidden />
          {t('student.label')}
        </label>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              id={inputId}
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setProblem(null)
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={STUDENT_ID_LENGTH + 6}
              placeholder={t('student.placeholder')}
              aria-invalid={problem !== null}
              aria-describedby={messageId}
              className={cn(
                'min-h-11 w-full rounded-xl border bg-white px-4 pr-28 font-mono text-base tracking-wide text-stone-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-stone-400',
                problem ? 'border-rose-400' : 'border-stone-300',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs tabular-nums',
                digits.length === STUDENT_ID_LENGTH ? 'font-semibold text-teal-700' : 'text-stone-500',
              )}
            >
              {t('student.digitCount', { count: formatNumber(digits.length) })}
            </span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              {t('student.save')}
            </Button>
            {studentId !== null && (
              <Button variant="secondary" onClick={stopEditing}>
                {t('student.cancelEdit')}
              </Button>
            )}
          </div>
        </div>

        <p
          id={messageId}
          role={problem ? 'alert' : undefined}
          className={cn('mt-2 text-sm', problem ? 'font-medium text-rose-700' : nudged ? 'font-medium text-amber-900' : 'text-teal-900/80')}
        >
          {message}
        </p>
      </form>
    </section>
  )
}
