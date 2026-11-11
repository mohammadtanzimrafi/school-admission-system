import { useCallback } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { banglaOrdinal, describeClass, type ShiftKey } from './classInfo'

export interface ClassLabel {
  /** "ষষ্ঠ শ্রেণি" / "Class 6", or the name as typed when it has no grade. */
  title: string
  /** "প্রভাতী শিফট" / "Morning shift", the typed shift, or empty. */
  shift: string
  /** "ষষ্ঠ শ্রেণি — প্রভাতী শিফট", the one-line form used in headings and tables. */
  full: string
  /** The character in the square badge: the grade in local digits, or an initial. */
  badge: string
  /** School hours of the shift, when it is one the school publishes hours for. */
  hours: string | null
  grade: number | null
  shiftKey: ShiftKey | null
}

/** Turns a stored class name into the words the current language uses for it. */
export function useClassLabel(): (name: string) => ClassLabel {
  const { t, locale, formatNumber } = useI18n()

  return useCallback(
    (name: string) => {
      const info = describeClass(name)
      const ordinal = info.grade !== null && locale === 'bn' ? banglaOrdinal(info.grade) : null

      const title =
        info.grade === null
          ? info.gradeText
          : ordinal
            ? t('class.grade', { ordinal })
            : t('class.gradeNumber', { number: formatNumber(info.grade) })
      const shift = info.shift ? t(`shift.${info.shift}`) : info.shiftText

      return {
        title,
        shift,
        full: shift ? `${title} — ${shift}` : title,
        badge: info.grade !== null ? formatNumber(info.grade) : info.gradeText.charAt(0).toUpperCase(),
        hours: info.shift ? t(`shift.${info.shift}.hours`) : null,
        grade: info.grade,
        shiftKey: info.shift,
      }
    },
    [t, locale, formatNumber],
  )
}
