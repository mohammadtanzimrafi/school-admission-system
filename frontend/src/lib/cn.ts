/** Joins class names, skipping falsy ones: cn('a', condition && 'b'). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
