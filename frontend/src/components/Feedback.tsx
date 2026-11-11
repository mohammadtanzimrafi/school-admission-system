import { CircleAlert, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { Button } from './Button'

/** Breadcrumb, serif headline and intro line that open every page. */
export function PageHeader({ crumbs, title, subtitle, aside }: { crumbs: string[]; title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-muted">{crumbs.join('  /  ')}</p>
        <h1 className="mt-1.5 font-serif text-[28px] leading-[1.55] font-medium text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-0.5 max-w-3xl text-base text-muted">{subtitle}</p>}
      </div>
      {aside && <div className="shrink-0 sm:pt-7">{aside}</div>}
    </header>
  )
}

/** Section heading with a short line under it. */
export function SectionHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] leading-[1.5] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  )
}

const noticeTones = {
  amber: 'bg-amber-wash text-amber-ink',
  green: 'bg-brand-tint text-brand',
  stone: 'bg-stone-wash text-muted',
  rose: 'bg-clay-tint text-clay-ink',
  sage: 'bg-sage-200 text-brand',
}

/** A full-width coloured strip with one message. */
export function NoticeBar({ tone, icon, children, className }: { tone: keyof typeof noticeTones; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-[9px] px-5 py-4 text-[15px] font-medium', noticeTones[tone], className)}>
      {icon && <span className="shrink-0 text-xl leading-6" aria-hidden>{icon}</span>}
      <div className="min-w-0 leading-6">{children}</div>
    </div>
  )
}

/** "Nothing here yet" with a next step, instead of an empty screen. */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-white px-6 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-sage-200 text-brand">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-muted">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/** A failed load, explained in plain words, with a way to try again. */
export function ErrorState({ title, error, onRetry, retrying }: { title: string; error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const { t, describeError } = useI18n()

  return (
    <div role="alert" className="rounded-[14px] border border-clay-tint bg-white px-6 py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-clay-tint text-clay-ink">
        <CircleAlert className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-muted">{describeError(error)}</p>
      {onRetry && (
        <div className="mt-6 flex justify-center">
          <Button variant="soft" onClick={onRetry} loading={retrying} icon={<RefreshCw className="size-4" aria-hidden />}>
            {t('common.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Placeholder shown while content loads, so the layout does not jump. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-sage-200', className)} />
}

/** Text with `\n` line breaks from the message catalogue. */
export function Lines({ text, className }: { text: string; className?: string }) {
  return <span className={cn('whitespace-pre-line', className)}>{text}</span>
}
