/**
 * localStorage can throw (private browsing, blocked cookies). The app must keep working
 * without it, so reads fall back to null and writes are best-effort.
 */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Not being able to remember a preference is not worth interrupting the user for.
  }
}
