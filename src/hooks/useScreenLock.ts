import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to sync screen lock state with Electron main process.
 * Returns [isLocked, toggleLock].
 */
export function useScreenLock(): [boolean, () => void] {
    const [isLocked, setIsLocked] = useState(false)

    useEffect(() => {
        // Get initial state
        window.electronAPI.getScreenLock().then(setIsLocked)

        // Subscribe to changes
        const cleanup = window.electronAPI.onScreenLockChanged(setIsLocked)
        return cleanup
    }, [])

    const toggle = useCallback(() => {
        window.electronAPI.toggleScreenLock()
    }, [])

    return [isLocked, toggle]
}
