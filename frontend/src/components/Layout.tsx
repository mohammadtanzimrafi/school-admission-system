import { GraduationCap, Languages, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useMatch } from 'react-router'
import { effectiveStatus, useMyHolds } from '../api/queries'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { cn } from '../lib/cn'
import { useServerReachable } from '../lib/connection'
import { StudentBar } from '../student/StudentBar'
import { useStudent } from '../student/StudentProvider'
import { buttonClasses } from './Button'
import { CountdownChip } from './Countdown'

export function Layout({ children }: { children: ReactNode }) {
  const { t, toggleLocale } = useI18n()

  const navLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors',
      isActive ? 'bg-white/15 text-white' : 'text-teal-50 hover:bg-white/10',
    )

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        {t('app.skipToContent')}
      </a>

      <header className="bg-teal-800 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 rounded-lg">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
              <GraduationCap className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-lg leading-tight font-bold">{t('app.title')}</span>
              <span className="block text-xs text-teal-100">{t('app.tagline')}</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t('nav.languageLabel')}
            className="order-2 ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-teal-50 hover:bg-white/10 sm:order-3 sm:ml-0"
          >
            <Languages className="size-4" aria-hidden />
            {t('nav.language')}
          </button>

          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-2 sm:mx-0 sm:ml-auto sm:w-auto sm:px-0">
            <NavLink to="/" end className={navLink}>
              {t('nav.classes')}
            </NavLink>
            <NavLink to="/applications" className={navLink}>
              {t('nav.myApplications')}
            </NavLink>
            <NavLink to="/admin/classes/new" className={navLink}>
              {t('nav.newClass')}
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase">{t('nav.adminTag')}</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <StudentBar />
      <ConnectionBanner />
      <ActiveApplicationBanner />

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}

/** Tells the user, on every page, when the server cannot be reached. */
function ConnectionBanner() {
  const { t } = useI18n()
  const reachable = useServerReachable()
  if (reachable) return null

  return (
    <div role="alert" className="border-b border-rose-300 bg-rose-100 text-rose-900">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm font-medium sm:px-6">
        <WifiOff className="size-5 shrink-0" aria-hidden />
        {t('connection.lost')}
      </div>
    </div>
  )
}

/**
 * Wherever the student is in the app (and after a refresh or reopening the browser),
 * an unpaid application stays in view with its countdown and a shortcut to pay.
 */
function ActiveApplicationBanner() {
  const { t } = useI18n()
  const { studentId } = useStudent()
  const { data: holds } = useMyHolds(studentId)
  const onApplicationPage = useMatch('/applications/:holdId')
  const onMyApplications = useMatch('/applications')

  const pending = (holds ?? []).filter((hold) => hold.status === 'HELD')
  const now = useNow(pending.length > 0)
  const next = pending
    .filter((hold) => effectiveStatus(hold, now) === 'HELD')
    .sort((a, b) => a.deadline - b.deadline)[0]

  // No need to repeat it on the screens that already show this application.
  if (!next || onMyApplications || onApplicationPage?.params.holdId === next.holdId) return null
  const remainingMs = next.deadline - now

  return (
    <div className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <CountdownChip remainingMs={remainingMs} className="bg-amber-200" />
        <p className="min-w-0 flex-1 text-sm text-amber-950">
          <span className="font-bold">{t('active.title')}</span>
          {' · '}
          {t('active.body', { className: next.className ?? '' })}
        </p>
        <Link to={`/applications/${next.holdId}`} className={buttonClasses('primary', 'sm')}>
          {t('active.action')}
        </Link>
      </div>
    </div>
  )
}
