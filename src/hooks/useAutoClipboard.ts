import { useEffect, useRef } from 'react'
import { useTimerStore } from '../store/timerStore'
import { useTickingTimer } from './useTickingTimer'
import { formatAllTimers } from '../utils/format'

/**
 * Automatically sync all active Flash timers to the Windows clipboard.
 *
 * Runs every 1s tick. When the formatted text changes (new timer added,
 * timer expired, timer adjusted), writes the updated text to clipboard.
 * Clears clipboard when no active timers remain.
 */
export function useAutoClipboard() {
    useTickingTimer() // re-run every second

    const enemies = useTimerStore((s) => s.enemies)
    const prevTextRef = useRef('')

    useEffect(() => {
        const text = formatAllTimers(enemies)

        if (text !== prevTextRef.current) {
            prevTextRef.current = text
            window.electronAPI.copyToClipboard(text)
        }
    })
}
