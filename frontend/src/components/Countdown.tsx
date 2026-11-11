import { cn } from '../lib/cn'

/** "08:42". The design draws timers with Latin digits in both languages. */
export function formatTimer(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = String(Math.floor(total / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

const URGENT_BELOW_MS = 60_000

/** The large ticking timer. Turns clay-red in the last minute. */
export function Countdown({ remainingMs, label, className }: { remainingMs: number; label?: string; className?: string }) {
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
