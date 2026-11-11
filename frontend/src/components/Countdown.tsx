import { Clock } from 'lucide-react'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

const URGENT_BELOW_MS = 60_000

/** Compact "mm:ss left" chip for lists and banners. */
export function CountdownChip({ remainingMs, className }: { remainingMs: number; className?: string }) {
  const { t, formatDuration } = useI18n()
  const urgent = remainingMs < URGENT_BELOW_MS

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums',
        urgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900',
        className,
      )}
    >
      <Clock className="size-4" aria-hidden />
      {t('my.timeLeft', { time: formatDuration(remainingMs) })}
    </span>
  )
}

/** The large timer on the application page. Turns red in the last minute. */
export function CountdownPanel({ remainingMs, deadline }: { remainingMs: number; deadline: number }) {
  const { t, formatDuration, formatClock } = useI18n()
  const urgent = remainingMs < URGENT_BELOW_MS

  return (
    <div
      className={cn(
        'rounded-2xl border px-6 py-5 text-center transition-colors',
        urgent ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50',
      )}
    >
      <p className={cn('text-sm font-semibold', urgent ? 'text-rose-800' : 'text-amber-900')}>{t('application.timeLeft')}</p>
      {/* role="timer" is announced on request, not every second, which would be unbearable. */}
      <p
        role="timer"
        data-testid="countdown"
        className={cn('mt-1 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl', urgent ? 'text-rose-700' : 'text-amber-950')}
      >
        {formatDuration(remainingMs)}
      </p>
      <p className={cn('mt-1 text-sm', urgent ? 'text-rose-800' : 'text-amber-900/80')}>
        {t('application.expiresAt', { time: formatClock(new Date(deadline)) })}
      </p>
    </div>
  )
}
