import { Check } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import chevronDown from '../../assets/icons/chevron-down.svg'
import { useI18n } from '../../i18n/I18nProvider'
import { cn } from '../../lib/cn'

/**
 * Guardian or admin. There is no login, so this is only a shortcut between the two
 * sides of the app: it shows which side the current page belongs to and jumps to the other.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const isAdmin = useLocation().pathname.startsWith('/admin')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return
    // Start on the side the user is on, as a native menu would.
    items.current[isAdmin ? 1 : 0]?.focus()
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, isAdmin])

  function choose(admin: boolean) {
    setOpen(false)
    if (admin !== isAdmin) navigate(admin ? '/admin/classes' : '/')
  }

  /** Up and down arrows move between the choices; Tab leaves the menu. */
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') return setOpen(false)
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const current = items.current.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    items.current[(current + step + items.current.length) % items.current.length]?.focus()
  }

  const options = [
    { admin: false, label: t('role.guardian') },
    { admin: true, label: t('role.admin') },
  ]

  return (
    <div ref={root} className={cn('relative', className)}>
      <button
        ref={toggle}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-[42px] items-center justify-between gap-3 rounded-lg bg-sage-50 px-3.5 text-[15px] font-medium text-ink-strong hover:bg-sage-100 lg:w-[164px]"
      >
        <span>
          <span className="sr-only">{t('role.label')}: </span>
          {isAdmin ? t('role.admin') : t('role.guardian')}
        </span>
        <img src={chevronDown} width={16} height={16} alt="" className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('role.label')}
          onKeyDown={moveFocus}
          className="absolute right-0 z-40 mt-1.5 w-[164px] rounded-lg bg-white p-1 shadow-lg ring-1 ring-line motion-safe:animate-page-in"
        >
          {options.map((option, index) => (
            <button
              key={option.label}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={option.admin === isAdmin}
              onClick={() => choose(option.admin)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[15px] text-ink hover:bg-sage-50"
            >
              {option.label}
              {option.admin === isAdmin && <Check className="size-4 text-brand" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
