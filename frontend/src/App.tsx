import { TriangleAlert } from 'lucide-react'
import { Route, Routes } from 'react-router'
import { Button } from './components/Button'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EmptyState } from './components/Feedback'
import { Layout } from './components/Layout'
import { useI18n } from './i18n/I18nProvider'
import { ApplicationPage } from './pages/ApplicationPage'
import { ClassListPage } from './pages/ClassListPage'
import { CreateClassPage } from './pages/CreateClassPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <Layout>
      <ErrorBoundary fallback={<CrashScreen />}>
        <Routes>
          <Route path="/" element={<ClassListPage />} />
          <Route path="/applications" element={<MyApplicationsPage />} />
          <Route path="/applications/:holdId" element={<ApplicationPage />} />
          <Route path="/admin/classes/new" element={<CreateClassPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  )
}

function CrashScreen() {
  const { t } = useI18n()

  return (
    <EmptyState
      icon={<TriangleAlert className="size-7" aria-hidden />}
      title={t('crash.title')}
      body={t('crash.body')}
      action={<Button onClick={() => window.location.reload()}>{t('crash.action')}</Button>}
    />
  )
}
