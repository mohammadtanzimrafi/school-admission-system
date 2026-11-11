import { useSyncExternalStore } from 'react'

const TICK_MS = 250

/**
 * One shared clock for the whole app. However many countdowns are on screen they all
 * read the same "now" from a single timer, and the timer only runs while someone listens.
 */
let current = Date.now()
let timer: number | undefined
const listeners = new Set<() => void>()

function tick(): void {
  current = Date.now()
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    current = Date.now()
    timer = window.setInterval(tick, TICK_MS)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearInterval(timer)
  }
}

const subscribeToNothing = () => () => {}
const getSnapshot = () => current

/**
 * The current time, refreshed several times a second while `active` is true.
 * A countdown is always "deadline minus now", so it cannot drift the way a
 * decrementing counter does when a tab is throttled or the device sleeps.
 */
export function useNow(active = true): number {
  return useSyncExternalStore(active ? subscribe : subscribeToNothing, getSnapshot)
}
