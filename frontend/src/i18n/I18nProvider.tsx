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
  /** A number in the locale's digits (০-৯ in Bangla), with grouping. */
  formatNumber: (value: number) => string
  /** Swaps the ASCII digits inside any text for the locale's digits, e.g. a birth registration number. */
  formatDigits: (text: string) => string
  /** A share such as 0.752 as "75.2%". */
  formatPercent: (ratio: number) => string
  /** mm:ss for a countdown. */
  formatDuration: (milliseconds: number) => string
  /** A hold length in words: "10 minutes", "45 seconds". */
  formatHoldLength: (seconds: number) => string
  /** Time of day: "সকাল ১০:৪০" in Bangla, "10:40 AM" in English. */
  formatClock: (date: Date) => string
  /** The friendly message for any thrown value. */
  describeError: (error: unknown) => string
}

const I18nContext = createContext<I18n | null>(null)

const intlLocale: Record<Locale, string> = { bn: 'bn-BD', en: 'en-US' }

function isLocale(value: string | null): value is Locale {
  return value === 'bn' || value === 'en'
}

/** How Bangla speakers name the part of the day, which the design uses instead of AM/PM. */
function banglaDayPeriod(hour: number): string {
  if (hour >= 4 && hour < 12) return 'সকাল'
  if (hour >= 12 && hour < 15) return 'দুপুর'
  if (hour >= 15 && hour < 18) return 'বিকাল'
  if (hour >= 18 && hour < 20) return 'সন্ধ্যা'
  return 'রাত'
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
    const digitFormat = new Intl.NumberFormat(intlLocale[locale], { useGrouping: false })
    const twoDigits = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2, useGrouping: false })
    const percentFormat = new Intl.NumberFormat(intlLocale[locale], { style: 'percent', maximumFractionDigits: 1 })
    const englishClock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const t: I18n['t'] = (key, params) => {
      const template = dictionary[key] ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
        name in params ? String(params[name]) : placeholder,
      )
    }

    const formatDigits = (text: string) => text.replace(/\d/g, (digit) => digitFormat.format(Number(digit)))

    return {
      locale,
      toggleLocale,
      t,
      formatNumber: (number) => numberFormat.format(number),
      formatDigits,
      formatPercent: (ratio) => percentFormat.format(ratio),
      formatDuration: (milliseconds) => {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
        return `${twoDigits.format(Math.floor(totalSeconds / 60))}:${twoDigits.format(totalSeconds % 60)}`
      },
      formatHoldLength: (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const rest = seconds % 60
        if (minutes === 0) return t(rest === 1 ? 'duration.second' : 'duration.seconds', { count: numberFormat.format(rest) })
        if (rest === 0) return t(minutes === 1 ? 'duration.minute' : 'duration.minutes', { count: numberFormat.format(minutes) })
        return t('duration.minutesSeconds', { minutes: numberFormat.format(minutes), seconds: numberFormat.format(rest) })
      },
      formatClock: (date) => {
        if (locale === 'en') return englishClock.format(date)
        const hour = date.getHours()
        const twelveHour = hour % 12 === 0 ? 12 : hour % 12
        return `${banglaDayPeriod(hour)} ${formatDigits(String(twelveHour))}:${twoDigits.format(date.getMinutes())}`
      },
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
