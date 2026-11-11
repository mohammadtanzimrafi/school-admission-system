import { CircleAlert, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { Button } from './Button'

/** "Nothing here yet" with an optional next step, instead of an empty screen. */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">{icon}</div>
      <h2 className="mt-4 text-lg font-bold text-stone-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-stone-600">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/** A failed load, explained in plain words, with a way to try again. */
export function ErrorState({ title, error, onRetry, retrying }: { title: string; error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const { t, describeError } = useI18n()

  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <CircleAlert className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-bold text-rose-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-rose-800">{describeError(error)}</p>
      {onRetry && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onRetry} loading={retrying} icon={<RefreshCw className="size-4" aria-hidden />}>
            {t('common.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** A short inline note: information, a warning, or an error next to the thing it is about. */
export function Notice({ tone, icon, children, className }: { tone: 'info' | 'warning' | 'error'; icon?: ReactNode; children: ReactNode; className?: string }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  }

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm', tones[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

/** Grey placeholder shown while content loads, so the layout does not jump. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-stone-200', className)} />
}

export function PageHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-stone-600">{subtitle}</p>}
      </div>
      {aside}
    </div>
  )
}
