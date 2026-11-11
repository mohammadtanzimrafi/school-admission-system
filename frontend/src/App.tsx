import { TriangleAlert } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router'
import { Button } from './components/Button'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EmptyState } from './components/Feedback'
import { AppShell } from './components/layout/AppShell'
import { useI18n } from './i18n/I18nProvider'
import { CancelPage } from './pages/CancelPage'
import { ClassManagementPage } from './pages/ClassManagementPage'
import { ClassSearchPage } from './pages/ClassSearchPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PaymentPage } from './pages/PaymentPage'

export function App() {
  return (
    <AppShell>
      <ErrorBoundary fallback={<CrashScreen />}>
        <Routes>
          <Route path="/" element={<ClassSearchPage />} />
          <Route path="/applications" element={<MyApplicationsPage />} />
          <Route path="/applications/:holdId" element={<MyApplicationsPage />} />
          <Route path="/applications/:holdId/pay" element={<PaymentPage />} />
          <Route path="/applications/:holdId/cancel" element={<CancelPage />} />
          <Route path="/admin/classes" element={<ClassManagementPage />} />
          {/* The old address of the admin screen. */}
          <Route path="/admin/classes/new" element={<Navigate to="/admin/classes" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
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
