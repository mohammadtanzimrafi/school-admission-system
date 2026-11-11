import { useHoldSeconds } from '../api/queries'
import { Lines } from '../components/Feedback'
import { useI18n } from '../i18n/I18nProvider'

/** The green banner explaining the three steps. The sidebar's "help" link jumps here. */
export function HowItWorks() {
  const { t, formatHoldLength, formatDigits } = useI18n()
  const holdLength = formatHoldLength(useHoldSeconds())

  const steps = [t('hero.step1'), t('hero.step2', { duration: holdLength }), t('hero.step3')]

  return (
    <section id="how-it-works" className="scroll-mt-28 rounded-[14px] bg-sage-300 px-6 py-5 lg:flex lg:items-stretch lg:gap-8">
      <div className="flex-1">
        <h2 className="text-[23px] leading-[1.5] font-semibold text-ink">{t('hero.title')}</h2>
        <p className="mt-1.5 text-base text-olive">{t('hero.body')}</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2.5">
              <span aria-hidden className="flex size-[25px] shrink-0 items-center justify-center rounded-lg bg-zest-deep text-[13px] font-semibold text-ink">
                {formatDigits(String(index + 1).padStart(2, '0'))}
              </span>
              <span className="text-sm font-medium text-ink">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-5 border-t border-zest-deep pt-4 lg:mt-0 lg:w-[240px] lg:border-t-0 lg:border-l lg:pt-1 lg:pl-8">
        <p className="text-xs font-semibold text-olive">{t('hero.noLogin')}</p>
        <p className="mt-2 text-[17px] leading-[1.5] font-medium text-ink">
          <Lines text={t('hero.noLoginBody')} />
        </p>
      </div>
    </section>
  )
}
