import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const LIFETIME_MS: Record<ToastKind, number> = { success: 5_000, info: 5_000, error: 8_000 }

const looks: Record<ToastKind, { classes: string; Icon: typeof Info }> = {
  success: { classes: 'border-brand/20 bg-brand-tint text-brand', Icon: CircleCheck },
  error: { classes: 'border-clay-ink/20 bg-clay-tint text-clay-ink', Icon: CircleAlert },
  info: { classes: 'border-line bg-white text-ink', Icon: Info },
}

/** Short messages that confirm an action or explain why it failed. They never block the page. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++
      // Keep the three most recent so a burst of errors cannot cover the screen.
      setToasts((current) => [...current.filter((toast) => toast.message !== message), { id, kind, message }].slice(-3))
      window.setTimeout(() => dismiss(id), LIFETIME_MS[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map(({ id, kind, message }) => {
          const { classes, Icon } = looks[kind]
          return (
            <div
              key={id}
              role={kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
                classes,
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm font-medium">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label={t('common.close')}
                className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.')
  return context
}
