import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { shouldRetry } from './api/queries'
import { ToastProvider } from './components/Toasts'
import { I18nProvider } from './i18n/I18nProvider'
import type { Locale } from './i18n/messages'
import { StudentProvider } from './student/StudentProvider'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: 1_000,
        // Let requests run even if the browser believes it is offline; a failed request
        // is reported properly, whereas a paused one would just hang.
        networkMode: 'always',
      },
      mutations: { retry: false, networkMode: 'always' },
    },
  })
}

interface AppProvidersProps {
  children: ReactNode
  /** Overrides for tests. */
  queryClient?: QueryClient
  initialLocale?: Locale
  initialStudentId?: string | null
}

/** Everything the screens depend on: language, toasts, server data cache, current student. */
export function AppProviders({ children, queryClient, initialLocale, initialStudentId }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())

  return (
    <I18nProvider initialLocale={initialLocale}>
      <ToastProvider>
        <QueryClientProvider client={client}>
          <StudentProvider initialStudentId={initialStudentId}>{children}</StudentProvider>
        </QueryClientProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
