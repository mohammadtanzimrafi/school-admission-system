import { SendHorizontal, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { Link } from 'react-router'
import { effectiveStatus, useClasses, useHoldSeconds, useMyHolds } from '../api/queries'
import bookLogo from '../assets/icons/book-logo.svg'
import { useClassLabel } from '../classes/useClassLabel'
import { Arrow } from '../components/Button'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useStudent } from '../student/StudentProvider'
import { matchIntent, type IntentId } from './intents'
import { buildReply, greeting, SUGGESTIONS, type AssistantAction, type AssistantContext } from './replies'

export interface ChatMessage {
  id: number
  from: 'bot' | 'user'
  text: string
  actions?: AssistantAction[]
  suggest?: boolean
}

/** A short pause before answering reads as a reply rather than a page refresh. */
const REPLY_DELAY_MS = 350

let lastMessageId = 0
const nextMessageId = () => ++lastMessageId

interface AssistantPanelProps {
  /** Kept by the launcher, so the conversation survives closing and reopening. */
  messages: ChatMessage[]
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  onClose: () => void
}

/**
 * The help chat. Answers come from a fixed set of topics (intents.ts, replies.ts), filled in
 * with this guardian's live situation: the held seat and its time left, admitted classes,
 * classes with free seats, and how long a hold lasts. No question leaves the browser.
 */
export function AssistantPanel({ messages, setMessages, onClose }: AssistantPanelProps) {
  const { t, locale, toggleLocale, formatDigits, formatHoldLength, formatNumber, formatDuration } = useI18n()
  const { studentId, askForStudentId } = useStudent()
  const myHolds = useMyHolds(studentId)
  const classes = useClasses()
  const holdSeconds = useHoldSeconds()
  const classLabel = useClassLabel()
  const titleId = useId()
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const replyTimer = useRef<number | undefined>(undefined)

  /** What is true right now, worded for the answers. Read when a question is asked. */
  function snapshot(): AssistantContext {
    const now = Date.now()
    const holds = myHolds.data ?? []
    const pending = holds.filter((hold) => effectiveStatus(hold, now) === 'HELD').sort((a, b) => a.deadline - b.deadline)[0]
    const nameOf = (name: string | undefined) => classLabel(name ?? '').full

    return {
      studentId: studentId ? formatDigits(studentId) : null,
      holdLength: formatHoldLength(holdSeconds),
      pending: pending ? { holdId: pending.holdId, className: nameOf(pending.className), timeLeft: formatDuration(pending.deadline - now) } : null,
      admitted: holds.filter((hold) => hold.status === 'CONFIRMED').map((hold) => nameOf(hold.className)),
      applicationCount: holds.length,
      applicationCountLabel: formatNumber(holds.length),
      openClasses:
        classes.data
          ?.filter((seats) => seats.availableSeats > 0)
          .sort((a, b) => b.availableSeats - a.availableSeats)
          .map((seats) => ({ name: nameOf(seats.name), available: formatNumber(seats.availableSeats) })) ?? null,
    }
  }

  const opening: ChatMessage = { id: 0, from: 'bot', ...greeting(locale) }
  const shown = messages.length > 0 ? messages : [opening]
  const last = shown[shown.length - 1]

  useEffect(() => {
    input.current?.focus()
    return () => window.clearTimeout(replyTimer.current)
  }, [])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [shown.length, typing])

  function ask(question: string, topic: IntentId | null = matchIntent(question)) {
    const text = question.trim()
    if (!text || typing) return

    const reply = buildReply(topic, snapshot(), locale)
    setMessages((current) => [...(current.length > 0 ? current : [opening]), { id: nextMessageId(), from: 'user', text }])
    setDraft('')
    setTyping(true)
    replyTimer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextMessageId(), from: 'bot', ...reply }])
      setTyping(false)
    }, REPLY_DELAY_MS)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    ask(draft)
  }

  function run(action: Extract<AssistantAction, { run: string }>) {
    if (action.run === 'toggleLanguage') return toggleLocale()
    onClose()
    askForStudentId()
  }

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className="fixed inset-x-3 top-20 bottom-24 z-40 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 shadow-forest/20 ring-line motion-safe:animate-page-in sm:inset-x-auto sm:top-auto sm:right-5 sm:h-[560px] sm:max-h-[calc(100vh-8rem)] sm:w-[380px]"
    >
      <header className="flex items-center gap-3 bg-forest px-4 py-3.5 text-white">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-zest">
          <img src={bookLogo} width={20} height={20} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="leading-tight font-semibold">{t('assistant.title')}</h2>
          <p className="text-xs text-forest-muted">{t('assistant.subtitle')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('assistant.close')} className="rounded-lg p-1.5 text-forest-muted hover:bg-white/10 hover:text-white">
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
        {shown.map((message) => (
          <Bubble key={message.id} message={message} onLink={onClose} onRun={run} />
        ))}

        {typing && (
          <p className="flex w-fit gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3.5 ring-1 ring-line" aria-label={t('assistant.typing')}>
            {[0, 150, 300].map((delay) => (
              <span key={delay} aria-hidden className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </p>
        )}

        {!typing && last.from === 'bot' && last.suggest && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS[locale].map((suggestion) => (
              <button
                key={suggestion.topic}
                type="button"
                onClick={() => ask(suggestion.text, suggestion.topic)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-sage-50"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-white p-3">
        <input
          ref={input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
          maxLength={200}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70"
        />
        <button
          type="submit"
          disabled={!draft.trim() || typing}
          aria-label={t('assistant.send')}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-sage-100 disabled:text-muted"
        >
          <SendHorizontal className="size-5" aria-hidden />
        </button>
      </form>
    </section>
  )
}

const actionClasses = 'inline-flex items-center gap-1.5 rounded-lg bg-brand-tint px-3 py-1.5 text-[13px] font-semibold text-brand transition-colors hover:bg-sage-200'

function Bubble({ message, onLink, onRun }: { message: ChatMessage; onLink: () => void; onRun: (action: Extract<AssistantAction, { run: string }>) => void }) {
  const fromBot = message.from === 'bot'

  return (
    <div className={cn('flex flex-col gap-2', fromBot ? 'items-start' : 'items-end')}>
      <p
        className={cn(
          'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line',
          fromBot ? 'rounded-tl-md bg-white text-ink ring-1 ring-line' : 'rounded-tr-md bg-brand text-white',
        )}
      >
        {message.text}
      </p>
      {message.actions && message.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.actions.map((action) =>
            'to' in action ? (
              <Link key={action.label} to={action.to} onClick={onLink} className={actionClasses}>
                {action.label} <Arrow />
              </Link>
            ) : (
              <button key={action.label} type="button" onClick={() => onRun(action)} className={actionClasses}>
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
