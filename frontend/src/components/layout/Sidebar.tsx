import { NavLink, Link } from 'react-router'
import bookLogo from '../../assets/icons/book-logo.svg'
import helpIcon from '../../assets/icons/help.svg'
import bookActive from '../../assets/icons/nav-book-active.svg'
import bookInactive from '../../assets/icons/nav-book-inactive.svg'
import docActive from '../../assets/icons/nav-doc-active.svg'
import docInactive from '../../assets/icons/nav-doc-inactive.svg'
import gridActive from '../../assets/icons/nav-grid-active.svg'
import gridInactive from '../../assets/icons/nav-grid-inactive.svg'
import { ACADEMIC_YEAR } from '../../config'
import { useI18n } from '../../i18n/I18nProvider'
import type { MessageKey } from '../../i18n/messages'
import { cn } from '../../lib/cn'
import { Lines } from '../Feedback'

interface NavItem {
  to: string
  label: MessageKey
  /** The design ships each icon twice: dark on the lime active pill, pale otherwise. */
  icon: { active: string; inactive: string }
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'nav.classes', icon: { active: gridActive, inactive: gridInactive }, end: true },
  { to: '/applications', label: 'nav.applications', icon: { active: docActive, inactive: docInactive } },
  { to: '/admin/classes', label: 'nav.management', icon: { active: bookActive, inactive: bookInactive } },
]

/** Brand, navigation, the admissions note and the footer. Used fixed on desktop and in the phone drawer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, formatDigits, toggleLocale } = useI18n()

  return (
    <div className="flex min-h-full flex-col px-4 pt-[34px] pb-7">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 self-start rounded-lg px-2">
        <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-zest">
          <img src={bookLogo} width={20} height={20} alt="" />
        </span>
        <span className="text-[25px] leading-[1.5] font-semibold text-white">{t('app.name')}</span>
      </Link>
      <p className="mt-4 px-[9px] text-xs font-medium text-forest-muted">{t('app.tagline')}</p>

      <div className="mx-2 mt-5 h-px bg-forest-line" />

      <p className="mt-7 px-[9px] text-xs font-medium text-forest-faint">{t('nav.section')}</p>
      <nav aria-label={t('nav.section')} className="mt-4 flex flex-col gap-2.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-lg px-[13px] text-[15px]',
                isActive ? 'bg-zest font-semibold text-ink-strong' : 'font-medium text-forest-text hover:bg-white/5',
              )
            }
          >
            {({ isActive }) => (
              <>
                <img src={isActive ? item.icon.active : item.icon.inactive} width={20} height={20} alt="" />
                {t(item.label)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-12">
        <div className="mx-1 rounded-xl bg-forest-raised p-4">
          <p className="font-serif text-lg leading-[1.5] font-medium text-forest-bright">
            <Lines text={t('nav.noteTitle')} />
          </p>
          <p className="mt-2.5 text-[13px] leading-[1.5] text-forest-muted">
            <Lines text={t('nav.noteBody')} />
          </p>
        </div>

        <div className="mx-2 mt-12 h-px bg-forest-line" />

        <Link
          to="/#how-it-works"
          onClick={onNavigate}
          className="mt-5 flex items-center gap-3 rounded-lg px-2.5 py-1 text-[15px] font-medium text-forest-text hover:text-white"
        >
          <img src={helpIcon} width={20} height={20} alt="" />
          {t('nav.help')}
        </Link>

        <div className="mt-9 flex items-center justify-between px-[9px] text-[13px]">
          <span className="text-forest-faint">{t('nav.year', { year: formatDigits(String(ACADEMIC_YEAR)) })}</span>
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={t('nav.languageLabel')}
            className="rounded px-1.5 py-0.5 font-medium text-forest-muted hover:bg-white/5 hover:text-white"
          >
            {t('nav.language')}
          </button>
        </div>
      </div>
    </div>
  )
}
