import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'

/** "আমার আবেদন · অ্যাডমিটলি" in the browser tab, so open tabs and history tell pages apart. */
export function useDocumentTitle(page: string): void {
  const { t } = useI18n()

  useEffect(() => {
    document.title = `${page} · ${t('app.name')}`
  }, [page, t])
}
