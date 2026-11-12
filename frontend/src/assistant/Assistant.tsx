import { MessageCircle, X } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import type { ChatMessage } from './AssistantPanel'

// The chat and everything it knows load the first time someone reaches for it.
const loadPanel = () => import('./AssistantPanel')
const AssistantPanel = lazy(() => loadPanel().then((module) => ({ default: module.AssistantPanel })))

/** The round help button in the corner and, when open, the chat above it. */
export function Assistant({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const launcher = useRef<HTMLButtonElement>(null)

  function close() {
    onOpenChange(false)
    launcher.current?.focus()
  }

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel messages={messages} setMessages={setMessages} onClose={close} />
        </Suspense>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={() => onOpenChange(!open)}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-expanded={open}
        aria-label={open ? t('assistant.close') : t('assistant.open')}
        className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-forest/25 transition-[transform,background-color] duration-150 hover:scale-105 hover:bg-brand-hover active:scale-95"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
      </button>
    </>
  )
}
