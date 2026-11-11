import type { HoldStatus } from '../api/types'
import { useHoldSeconds } from '../api/queries'
import { Lines } from '../components/Feedback'
import { StepBadge, type StepState } from '../components/Steps'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

/**
 * The panel beside the application: where the student is in the three steps, or, once
 * the application has ended without an admission, what they can do next.
 */
export function AdmissionGuide({ status, classLine }: { status: HoldStatus; classLine: string }) {
  const { t, formatHoldLength } = useI18n()
  const holdLength = formatHoldLength(useHoldSeconds())

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <aside className="h-full rounded-[14px] bg-sage-200 p-6">
        <h2 className="text-xl leading-[1.55] font-semibold text-ink">{t('next.title')}</h2>
        <p className="mt-7 text-base leading-[1.55] text-muted">{t('next.body', { duration: holdLength })}</p>
        <div className="my-6 h-px bg-line" />
        <p className="text-sm leading-[1.55] text-ink">{t('next.note')}</p>
        <p className={cn('mt-4 text-[13px] font-medium', status === 'EXPIRED' ? 'text-amber-ink' : 'text-muted')}>{t('next.noCharge')}</p>
      </aside>
    )
  }

  const confirmed = status === 'CONFIRMED'
  const steps: { title: string; body: string; state: StepState }[] = [
    { title: t('guide.choose'), body: classLine, state: 'done' },
    { title: t('guide.hold'), body: t('guide.holdBody', { duration: holdLength }), state: 'done' },
    {
      title: t('guide.confirm'),
      body: confirmed ? t('guide.confirmDone') : t('guide.confirmPending'),
      state: confirmed ? 'done' : 'upcoming',
    },
  ]

  return (
    <aside className="h-full rounded-[14px] bg-sage-200 p-6">
      <h2 className="text-[19px] leading-[1.5] font-semibold text-ink">{t('guide.title')}</h2>
      <ol className="mt-7 space-y-5">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3.5">
            <span className="mt-0.5">
              <StepBadge state={step.state} number={index + 1} />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">{step.title}</p>
              <p className="text-sm text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-7 text-sm text-muted">
        <Lines text={t('guide.saved')} />
      </p>
    </aside>
  )
}
