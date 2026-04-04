import { useSyncExternalStore } from 'react'

/**
 * Global 1-second ticker shared across all components.
 * Uses a single setInterval instead of one per component.
 */
let tick = 0
let listeners: Array<() => void> = []

const interval = setInterval(() => {
    tick++
    for (const listener of listeners) {
        listener()
    }
}, 1000)

// Prevent the interval from keeping the process alive in tests
if (typeof interval === 'object' && 'unref' in interval) {
    interval.unref()
}

function subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
        listeners = listeners.filter((l) => l !== listener)
    }
}

function getSnapshot() {
    return tick
}

export function useTickingTimer(): number {
    return useSyncExternalStore(subscribe, getSnapshot)
}
