import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  dismissLabel: string
  onConfirm: () => void
  onDismiss: () => void
}

/** Asks "are you sure?" before an action that cannot be undone. Escape or the backdrop dismisses it. */
export function ConfirmDialog({ open, title, body, confirmLabel, dismissLabel, onConfirm, onDismiss }: ConfirmDialogProps) {
  const titleId = useId()
  const dismissRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus the safe choice so pressing Enter by reflex does not destroy anything.
    dismissRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onDismiss])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center" onClick={onDismiss}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-stone-900">
          {title}
        </h2>
        <div className="mt-2 text-stone-600">{body}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={dismissRef} variant="secondary" onClick={onDismiss}>
            {dismissLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
