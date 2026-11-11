import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../api/http'
import { readStored, writeStored } from '../lib/storage'
import { messages, type Locale, type MessageKey } from './messages'

const STORAGE_KEY = 'admission.locale'

interface I18n {
  locale: Locale
  toggleLocale: () => void
  /** Looks up a message and fills in its {placeholders}. */
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  /** Formats a number with the locale's digits (০-৯ in Bangla). */
  formatNumber: (value: number) => string
  /** mm:ss for a countdown, in the locale's digits. */
  formatDuration: (milliseconds: number) => string
  /** Wall-clock time of a timestamp, e.g. 10:45:30 AM. */
  formatClock: (date: Date) => string
  /** The friendly message for any thrown value. */
  describeError: (error: unknown) => string
}

const I18nContext = createContext<I18n | null>(null)

const intlLocale: Record<Locale, string> = { bn: 'bn-BD', en: 'en-GB' }

function isLocale(value: string | null): value is Locale {
  return value === 'bn' || value === 'en'
}

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = readStored(STORAGE_KEY)
    return initialLocale ?? (isLocale(stored) ? stored : 'bn')
  })

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const toggleLocale = useCallback(() => {
    setLocale((current) => {
      const next = current === 'bn' ? 'en' : 'bn'
      writeStored(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo<I18n>(() => {
    const dictionary = messages[locale]
    const numberFormat = new Intl.NumberFormat(intlLocale[locale])
    const twoDigits = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2, useGrouping: false })
    const clockFormat = new Intl.DateTimeFormat(intlLocale[locale], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    const t: I18n['t'] = (key, params) => {
      const template = dictionary[key] ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        name in params ? String(params[name]) : placeholder,
      )
    }

    return {
      locale,
      toggleLocale,
      t,
      formatNumber: (number) => numberFormat.format(number),
      formatDuration: (milliseconds) => {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
        return `${twoDigits.format(Math.floor(totalSeconds / 60))}:${twoDigits.format(totalSeconds % 60)}`
      },
      formatClock: (date) => clockFormat.format(date),
      describeError: (error) => {
        const code = error instanceof ApiError ? error.code : 'UNKNOWN'
        const key = `error.${code}`
        return key in dictionary ? dictionary[key as MessageKey] : dictionary['error.UNKNOWN']
      },
    }
  }, [locale, toggleLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>.')
  return context
}
