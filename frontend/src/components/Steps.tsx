import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

export type StepState = 'done' | 'current' | 'upcoming'

/** The round step marker: a tick when done, the step number otherwise. */
export function StepBadge({ state, number }: { state: StepState; number: number }) {
  const { formatNumber } = useI18n()

  return (
    <span
      aria-hidden
      className={cn(
        'flex size-[30px] shrink-0 items-center justify-center rounded-full text-base font-semibold',
        state === 'upcoming' ? 'bg-white text-muted' : 'bg-brand text-white',
      )}
    >
      {state === 'done' ? '✓' : formatNumber(number)}
    </span>
  )
}

/** Horizontal progress strip: class chosen → payment → admission confirmed. */
export function ProgressSteps({ label, steps }: { label: string; steps: { title: string; state: StepState }[] }) {
  return (
    <ol aria-label={label} className="grid gap-3 rounded-[10px] bg-sage-200 px-6 py-3.5 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} aria-current={step.state === 'current' ? 'step' : undefined} className="flex items-center gap-3">
          <StepBadge state={step.state} number={index + 1} />
          <span className={cn('text-[15px]', step.state === 'current' ? 'font-semibold text-ink' : step.state === 'done' ? 'text-ink' : 'text-muted')}>
            {step.title}
          </span>
        </li>
      ))}
    </ol>
  )
}
