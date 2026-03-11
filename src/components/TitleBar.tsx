import { useScreenLock } from '../hooks/useScreenLock'

interface TitleBarProps {
    onSettingsToggle?: () => void
    settingsOpen?: boolean
}

export default function TitleBar({ onSettingsToggle, settingsOpen }: TitleBarProps) {
    const [isLocked, toggleLock] = useScreenLock()

    return (
        <div className="title-bar">
            <div className={`title-bar-drag ${isLocked ? 'no-drag' : ''}`}>
                <img className="title-logo" src="/logo.png" alt="logo" draggable={false} />
                <span className="title-text">JiJiGuGu</span>
            </div>
            <div className="title-bar-actions">
                <button
                    className={`title-btn ${settingsOpen ? 'active' : ''}`}
                    onClick={onSettingsToggle}
                    title="Settings"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
                <button
                    className={`title-btn lock-btn ${isLocked ? 'active' : ''}`}
                    onClick={toggleLock}
                    title={isLocked ? 'Unlock position' : 'Lock position'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5" />
                        <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
                        <path d="M5 15h14l-1.5-4H6.5z" />
                    </svg>
                </button>
                <button
                    className="title-btn"
                    onClick={() => window.electronAPI.minimizeApp()}
                    title="Minimize to tray"
                >
                    −
                </button>
            </div>
        </div>
    )
}
