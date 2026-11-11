import { useEffect, useId, useState, type FormEvent } from 'react'
import { useToast } from '../components/Toasts'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useStudent } from './StudentProvider'
import { checkStudentId, normalizeStudentId, STUDENT_ID_LENGTH } from './studentId'

/**
 * The birth registration number box in the top bar. It is the only identity the app has:
 * once saved it reads as a value with a "change" link; until then it is an input.
 */
export function StudentIdField() {
  const { t, formatDigits, formatNumber } = useI18n()
  const toast = useToast()
  const { studentId, setStudentId, inputRef, askCount } = useStudent()
  const inputId = useId()
  const messageId = useId()

  const [wantsToEdit, setWantsToEdit] = useState(false)
  const [answeredAsk, setAnsweredAsk] = useState(askCount)
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

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
      <div role="group" aria-label={t('student.label')} className="flex h-[58px] items-center gap-3 rounded-[9px] border border-line bg-white pr-4 pl-[13px]">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted">{t('student.label')}</p>
          <p data-testid="current-student-id" className="truncate text-base font-medium tracking-wide text-ink-strong tabular">
            {formatDigits(studentId)}
          </p>
        </div>
        <button type="button" onClick={startEditing} className="rounded px-1 text-[13px] font-semibold text-brand hover:underline">
          {t('student.change')}
        </button>
      </div>
    )
  }

  const message = problem ?? (nudged ? t('student.required') : focused ? t('student.help') : null)

  return (
    <form onSubmit={save} noValidate className="relative">
      <div
        className={cn(
          'flex h-[58px] items-center gap-2 rounded-[9px] border bg-white pr-2 pl-[13px] focus-within:border-brand',
          problem ? 'border-clay-ink' : nudged ? 'border-amber-ink' : 'border-line',
        )}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-[11px] font-semibold text-muted">
            {t('student.label')}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setProblem(null)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={STUDENT_ID_LENGTH + 6}
            placeholder={t('student.placeholder')}
            aria-invalid={problem !== null}
            aria-describedby={messageId}
            className="w-full bg-transparent text-base font-medium tracking-wide text-ink-strong outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/70"
          />
        </div>
        <span aria-hidden className={cn('text-xs tabular', digits.length === STUDENT_ID_LENGTH ? 'font-semibold text-brand' : 'text-muted')}>
          {t('student.digitCount', { count: formatNumber(digits.length) })}
        </span>
        <button type="submit" className="h-9 rounded-md bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover">
          {t('student.save')}
        </button>
        {studentId !== null && (
          <button type="button" onClick={stopEditing} className="h-9 rounded-md px-2 text-[13px] font-semibold text-muted hover:text-ink">
            {t('student.cancelEdit')}
          </button>
        )}
      </div>

      <p
        id={messageId}
        role={problem ? 'alert' : undefined}
        className={cn(
          'absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg px-3 py-2 text-[13px] shadow-sm ring-1',
          problem ? 'bg-clay-tint font-medium text-clay-ink ring-clay-tint' : nudged ? 'bg-amber-wash font-medium text-amber-ink ring-amber-tint' : 'bg-white text-muted ring-line',
          message === null && 'sr-only',
        )}
      >
        {message ?? t('student.help')}
      </p>
    </form>
  )
}
