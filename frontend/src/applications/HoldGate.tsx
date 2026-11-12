import type { ReactNode } from 'react'
import { ApiError } from '../api/http'
import { useHold } from '../api/queries'
import type { Hold } from '../api/types'
import { ErrorState } from '../components/Feedback'
import { useI18n } from '../i18n/I18nProvider'

interface HoldGateProps {
  holdId: string
  /** Kept on screen while loading and on failure, so the page does not jump. */
  header: ReactNode
  skeleton: ReactNode
  /** The page itself, once the application is known. */
  children: (hold: Hold) => ReactNode
}

/**
 * Loads one application for a page that is about it (details, payment, cancel) and deals
 * with the waiting, the "no such application" and the failure cases in one place.
 * A copy already in the cache shows at once, also while the server is unreachable.
 */
export function HoldGate({ holdId, header, skeleton, children }: HoldGateProps) {
  const { t } = useI18n()
  const hold = useHold(holdId)

  if (hold.data) return children(hold.data)

  if (hold.isPending) {
    return (
      <>
        {header}
        {skeleton}
      </>
    )
  }

  const missing = hold.error instanceof ApiError && hold.error.status === 404
  return (
    <>
      {header}
      <ErrorState
        title={t(missing ? 'my.notFound' : 'my.loadError')}
        error={hold.error}
        onRetry={missing ? undefined : () => hold.refetch()}
        retrying={hold.isFetching}
      />
    </>
  )
}
