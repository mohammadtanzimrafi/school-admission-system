import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useServerReachable } from '../lib/connection'

/** "● Updated every 5 seconds", or "Reconnecting…" while the server cannot be reached. */
export function LiveIndicator({ label }: { label: string }) {
  const { t } = useI18n()
  const live = useServerReachable()

  return (
    <p className={cn('inline-flex items-center gap-2 text-xs font-medium', live ? 'text-brand' : 'text-muted')}>
      <span aria-hidden className={cn('size-2 rounded-full', live ? 'animate-pulse bg-brand' : 'bg-muted')} />
      {live ? label : t('classes.reconnecting')}
    </p>
  )
}
