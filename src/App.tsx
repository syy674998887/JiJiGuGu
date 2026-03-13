import { useCallback, useEffect, useRef, useState } from 'react'
import TitleBar from './components/TitleBar'
import TimerPanel from './components/TimerPanel'
import CopyAllButton from './components/CopyAllButton'
import SettingsPanel from './components/SettingsPanel'
import { useTimerStore } from './store/timerStore'
import { useGameDetect } from './hooks/useGameDetect'
import { useAutoClipboard } from './hooks/useAutoClipboard'
import { useScreenLock } from './hooks/useScreenLock'

function App() {
    const loadSettings = useTimerStore((s) => s.loadSettings)
    useEffect(() => { loadSettings() }, [loadSettings])

    const { isInGame } = useGameDetect()
    useAutoClipboard()
    const [isLocked] = useScreenLock()
    const appRef = useRef<HTMLDivElement>(null)
    const [showSettings, setShowSettings] = useState(false)
    useEffect(() => {
        const el = appRef.current
        if (!el) return

        if (!isLocked) {
            window.electronAPI.setIgnoreMouseEvents(false)
            return
        }

        window.electronAPI.setIgnoreMouseEvents(true)

        const handleEnter = () => {
            window.electronAPI.setIgnoreMouseEvents(false)
        }
        const handleLeave = () => {
            window.electronAPI.setIgnoreMouseEvents(true)
        }

        el.addEventListener('mouseenter', handleEnter)
        el.addEventListener('mouseleave', handleLeave)

        return () => {
            el.removeEventListener('mouseenter', handleEnter)
            el.removeEventListener('mouseleave', handleLeave)
            window.electronAPI.setIgnoreMouseEvents(false)
        }
    }, [isLocked])

    // Auto-resize window to fit content
    const prevSizeRef = useRef({ w: 0, h: 0 })
    useEffect(() => {
        const el = appRef.current
        if (!el) return
        const observer = new ResizeObserver(() => {
            const zoom = 1.25
            const width = Math.ceil(el.offsetWidth * zoom)
            const height = Math.ceil(el.offsetHeight * zoom)
            if (width !== prevSizeRef.current.w || height !== prevSizeRef.current.h) {
                prevSizeRef.current = { w: width, h: height }
                window.electronAPI.setWindowSize(width, height)
            }
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const toggleSettings = useCallback(() => setShowSettings((v) => !v), [])

    return (
        <div className={`app ${isLocked ? 'locked' : ''}`} ref={appRef}>
            <TitleBar onSettingsToggle={toggleSettings} settingsOpen={showSettings} />

            <div className="app-content">
                {!isInGame ? (
                    <div className="status-bar waiting">
                        Waiting for League of Legends...
                    </div>
                ) : (
                    <>
                        <TimerPanel />
                        <CopyAllButton />
                    </>
                )}
                {showSettings && (
                    <SettingsPanel onClose={() => setShowSettings(false)} />
                )}
            </div>
        </div>
    )
}

export default App
