import { LoaderCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'soft' | 'quiet' | 'white' | 'danger'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  soft: 'bg-sage-100 text-brand hover:bg-sage-200',
  quiet: 'bg-sage-100 text-muted hover:bg-sage-200 hover:text-ink',
  white: 'bg-white text-brand ring-1 ring-line hover:bg-sage-50',
  danger: 'bg-clay-tint text-clay-ink hover:bg-[#f5e2da]',
}

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4',
  lg: 'min-h-12 px-5',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg text-[15px] font-semibold whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:bg-sage-100 disabled:text-muted/80',
    variants[variant],
    sizes[size],
    className,
  )
}

/** The "→" the design puts after forward actions. */
export function Arrow() {
  return <span aria-hidden>→</span>
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
  size?: Size
  /** Shows a spinner and blocks clicks, so an action cannot be sent twice. */
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, loading = false, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}
