import type { ReactNode } from 'react'
import type { HoldStatus } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

export type Tone = 'green' | 'amber' | 'stone' | 'expired' | 'lime'

const tones: Record<Tone, string> = {
  green: 'bg-brand-tint text-brand',
  amber: 'bg-amber-tint text-amber-ink',
  stone: 'bg-stone-wash text-muted',
  expired: 'bg-amber-wash text-amber-ink',
  lime: 'bg-sage-200 text-brand',
}

/** A rounded label: a status, a badge, a small fact. */
export function Pill({ tone, dot = false, className, children }: { tone: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap', tones[tone], className)}>
      {dot && <span aria-hidden className="size-2 rounded-full bg-current" />}
      {children}
    </span>
  )
}

const statusTone: Record<HoldStatus, Tone> = {
  HELD: 'amber',
  CONFIRMED: 'green',
  EXPIRED: 'expired',
  CANCELLED: 'stone',
}

/** An application's status in words. data-status carries the API value for tests and styling. */
export function StatusPill({ status, dot, className }: { status: HoldStatus; dot?: boolean; className?: string }) {
  const { t } = useI18n()

  return (
    <span data-status={status} className="inline-flex">
      <Pill tone={statusTone[status]} dot={dot} className={className}>
        {t(`status.${status}`)}
      </Pill>
    </span>
  )
}
