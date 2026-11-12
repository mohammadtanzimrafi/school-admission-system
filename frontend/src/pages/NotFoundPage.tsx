import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { buttonClasses } from '../components/Button'
import { EmptyState } from '../components/Feedback'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/I18nProvider'

export function NotFoundPage() {
  const { t } = useI18n()
  useDocumentTitle(t('notFound.title'))

  return (
    <EmptyState
      icon={<Compass className="size-7" aria-hidden />}
      title={t('notFound.title')}
      body={t('notFound.body')}
      action={
        <Link to="/" className={buttonClasses('primary')}>
          {t('notFound.action')}
        </Link>
      }
    />
  )
}
