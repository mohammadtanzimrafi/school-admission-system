import { useId, type ComponentProps, type ReactNode, type Ref } from 'react'
import { cn } from '../lib/cn'

interface FieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string
  /** Shown under the input until there is an error. */
  help?: ReactNode
  error?: string | null
  inputRef?: Ref<HTMLInputElement>
}

/** Label, input and one line of help that turns into the error message when there is one. */
export function Field({ label, help, error, inputRef, className, ...input }: FieldProps) {
  const id = useId()
  const noteId = `${id}-note`

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || help ? noteId : undefined}
        className={cn(
          'mt-2 h-[49px] w-full rounded-lg border bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70',
          error ? 'border-clay-ink' : 'border-line',
        )}
        {...input}
      />
      {(error || help) && (
        <p id={noteId} role={error ? 'alert' : undefined} className={cn('mt-2 text-[13px]', error ? 'font-medium text-clay-ink' : 'text-muted')}>
          {error ?? help}
        </p>
      )}
    </div>
  )
}
