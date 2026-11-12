import { Menu, WifiOff, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { Assistant } from '../../assistant/Assistant'
import { useI18n } from '../../i18n/I18nProvider'
import { useServerReachable } from '../../lib/connection'
import { StudentIdField } from '../../student/StudentIdField'
import { Sidebar } from './Sidebar'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

/** Sidebar on the left, top bar with the student's number, the page beneath, and the help chat. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  useStartPagesAtTheTop()

  const openHelp = () => {
    setMenuOpen(false)
    setHelpOpen(true)
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        {t('app.skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] overflow-y-auto bg-forest lg:block">
        <Sidebar onHelp={openHelp} />
      </aside>
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} onHelp={openHelp} />}
      <Assistant open={helpOpen} onOpenChange={setHelpOpen} />

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 border-b border-line bg-white">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-5 py-3.5 sm:px-10 lg:h-[88px] lg:flex-nowrap lg:gap-x-[30px] lg:py-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              className="-ml-2 rounded-lg p-2 text-ink-strong hover:bg-sage-50 lg:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </button>
            <p className="text-lg font-semibold text-ink-strong">{t('app.tagline')}</p>
            <div className="order-last w-full lg:order-none lg:ml-auto lg:w-[461px]">
              <StudentIdField />
            </div>
            <WorkspaceSwitcher className="ml-auto lg:ml-0" />
          </div>
        </header>

        <ConnectionBanner />

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1204px] px-5 pt-9 pb-14 focus:outline-none sm:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * A single-page app keeps the scroll position between pages; a guardian who presses "pay"
 * at the bottom of the history would land halfway down the payment page. Each new page
 * starts at the top instead, and focus moves to it so screen readers announce the change.
 * Links to a section (#how-it-works) are left to scroll to that section.
 */
function useStartPagesAtTheTop() {
  const { pathname, hash } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    if (hash) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname, hash])
}

/** The sidebar as a drawer on screens too narrow to keep it open. */
function MobileMenu({ onClose, onHelp }: { onClose: () => void; onHelp: () => void }) {
  const { t } = useI18n()
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    // The page behind the drawer should not scroll along with it.
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = bodyOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.section')}>
      <div className="absolute inset-0 bg-forest/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[260px] max-w-[85vw] overflow-y-auto bg-forest">
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="absolute top-3 right-3 rounded-lg p-2 text-forest-muted hover:bg-white/5 hover:text-white"
        >
          <X className="size-5" aria-hidden />
        </button>
        <Sidebar onNavigate={onClose} onHelp={onHelp} />
      </div>
    </div>
  )
}

/** Tells the user, on every page, when the server cannot be reached. */
function ConnectionBanner() {
  const { t } = useI18n()
  if (useServerReachable()) return null

  return (
    <div role="alert" className="border-b border-clay-tint bg-clay-tint text-clay-ink">
      <div className="mx-auto flex max-w-[1204px] items-center gap-3 px-5 py-2.5 text-sm font-medium sm:px-10">
        <WifiOff className="size-5 shrink-0" aria-hidden />
        {t('connection.lost')}
      </div>
    </div>
  )
}
