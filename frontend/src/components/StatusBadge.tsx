import { Ban, CircleCheck, Hourglass, TimerOff } from 'lucide-react'
import type { HoldStatus } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

const styles: Record<HoldStatus, { classes: string; Icon: typeof Ban }> = {
  HELD: { classes: 'bg-amber-100 text-amber-900 ring-amber-300', Icon: Hourglass },
  CONFIRMED: { classes: 'bg-emerald-100 text-emerald-900 ring-emerald-300', Icon: CircleCheck },
  EXPIRED: { classes: 'bg-stone-200 text-stone-700 ring-stone-300', Icon: TimerOff },
  CANCELLED: { classes: 'bg-rose-100 text-rose-800 ring-rose-200', Icon: Ban },
}

/** Shows an application's status in words, with the API's status code beside it. */
export function StatusBadge({ status, className }: { status: HoldStatus; className?: string }) {
  const { t } = useI18n()
  const { classes, Icon } = styles[status]

  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset',
        classes,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {t(`status.${status}`)}
      <span className="font-mono text-[0.65rem] font-medium tracking-wider opacity-70">{status}</span>
    </span>
  )
}
