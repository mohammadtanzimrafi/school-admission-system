import { useSyncExternalStore } from 'react'

/**
 * Tracks whether the last API call reached the server. Kept outside React so the HTTP
 * layer can update it; components subscribe with useServerReachable().
 */
let reachable = true
const listeners = new Set<() => void>()

export function reportServerReachable(next: boolean): void {
  if (next === reachable) return
  reachable = next
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useServerReachable(): boolean {
  return useSyncExternalStore(subscribe, () => reachable)
}
