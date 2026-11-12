import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

/** "08:42". The design draws timers with Latin digits in both languages. */
export function formatTimer(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = String(Math.floor(total / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

const URGENT_BELOW_MS = 60_000

/**
 * The large ticking timer, red in the last minute. It reads the shared clock itself, so
 * only these digits re-render every tick, not the page around them.
 */
export function Countdown({ deadline, label, className }: { deadline: number; label?: string; className?: string }) {
  const remainingMs = Math.max(0, deadline - useNow())
  const urgent = remainingMs < URGENT_BELOW_MS

  return (
    <div className={className}>
      {label && <p className="text-xs text-muted">{label}</p>}
      {/* role="timer" is announced on request, not every second. */}
      <p
        role="timer"
        data-testid="countdown"
        className={cn('text-[36px] leading-[1.45] font-semibold tabular', urgent ? 'text-clay-ink' : 'text-brand')}
      >
        {formatTimer(remainingMs)}
      </p>
    </div>
  )
}

/** "08:42 left" inside a line of text, ticking on its own. */
export function TimeLeft({ deadline }: { deadline: number }) {
  const { t } = useI18n()
  return <span className="tabular">{t('history.timeLeft', { time: formatTimer(deadline - useNow()) })}</span>
}
