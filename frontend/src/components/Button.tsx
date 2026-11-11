import { LoaderCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white shadow-sm hover:bg-teal-800 active:bg-teal-900',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 active:bg-stone-200',
  danger: 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:bg-rose-100',
  ghost: 'text-teal-800 hover:bg-teal-50 active:bg-teal-100',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-6 text-base',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    variants[variant],
    sizes[size],
    className,
  )
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
