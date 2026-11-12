import { TriangleAlert } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Button } from './components/Button'
import { ErrorBoundary } from './components/ErrorBoundary'
import { EmptyState, Skeleton } from './components/Feedback'
import { AppShell } from './components/layout/AppShell'
import { useI18n } from './i18n/I18nProvider'
import { CancelPage } from './pages/CancelPage'
import { ClassSearchPage } from './pages/ClassSearchPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PaymentPage } from './pages/PaymentPage'

// Guardians, the people under load on admission day, never open the admin side, so it is
// loaded only when someone does.
const ClassManagementPage = lazy(() => import('./pages/ClassManagementPage').then((module) => ({ default: module.ClassManagementPage })))

export function App() {
  const { pathname } = useLocation()

  return (
    <AppShell>
      {/* Keyed by page: a crash on one page is forgotten once the user moves to another. */}
      <ErrorBoundary key={pathname} fallback={<CrashScreen />}>
        <div className="motion-safe:animate-page-in">
          <Suspense fallback={<Skeleton className="h-[480px]" />}>
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
          </Suspense>
        </div>
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
