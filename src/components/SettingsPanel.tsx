import { useEffect, useState } from 'react'
import { useTimerStore } from '../store/timerStore'

interface SettingsPanelProps {
    onClose: () => void
}

const STATUS_LABEL: Record<string, string> = {
    valid: 'Valid',
    invalid: 'Invalid',
    empty: 'Not Set',
    checking: 'Checking...',
}

const STATUS_CLASS: Record<string, string> = {
    valid: 'api-valid',
    invalid: 'api-invalid',
    empty: 'api-empty',
    checking: 'api-checking',
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
    const reactionDelay = useTimerStore((s) => s.reactionDelay)
    const setReactionDelay = useTimerStore((s) => s.setReactionDelay)
    const debug = useTimerStore((s) => s.debug)
    const setDebug = useTimerStore((s) => s.setDebug)
    const showFlashOnly = useTimerStore((s) => s.showFlashOnly)
    const setShowFlashOnly = useTimerStore((s) => s.setShowFlashOnly)
    const riotApiKey = useTimerStore((s) => s.riotApiKey)
    const setRiotApiKey = useTimerStore((s) => s.setRiotApiKey)
    const validateCurrentRiotApiKey = useTimerStore((s) => s.validateCurrentRiotApiKey)
    const apiKeyStatus = useTimerStore((s) => s.apiKeyStatus)

    const [localKey, setLocalKey] = useState(riotApiKey)

    useEffect(() => {
        setLocalKey(riotApiKey)
    }, [riotApiKey])

    const saveKey = () => {
        const trimmedLocalKey = localKey.trim()

        if (trimmedLocalKey !== riotApiKey) {
            console.log('[RiotAPI][renderer] Settings saveKey detected key change')
            void setRiotApiKey(trimmedLocalKey)
            return
        }

        console.log('[RiotAPI][renderer] Settings saveKey re-validating current key')
        void validateCurrentRiotApiKey('settings-save')
    }

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <span className="settings-title">Settings</span>
                <button className="title-btn" onClick={onClose} title="Close settings">×</button>
            </div>

            {/* Riot API Key */}
            <div className="settings-row api-key-row">
                <label className="settings-label">
                    Riot API Key
                    <span className="settings-hint">
                        <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>developer.riotgames.com</a>
                    </span>
                </label>
                <span className={`api-status-label ${STATUS_CLASS[apiKeyStatus]}`}>
                    {STATUS_LABEL[apiKeyStatus] || '—'}
                </span>
            </div>
            <div className="settings-row api-key-input-row">
                <div className="api-key-input-wrap">
                    <input
                        className="settings-input api-key-input"
                        type="text"
                        value={localKey}
                        placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        onChange={(e) => setLocalKey(e.target.value)}
                        onBlur={saveKey}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveKey() }}
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
            </div>

            <div className="settings-row">
                <label className="settings-label">
                    Reaction Delay
                    <span className="settings-hint">Subtracted to Compensate Reaction Time</span>
                </label>
                <div className="settings-input-group">
                    <input
                        className="settings-input"
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={reactionDelay}
                        onChange={(e) => {
                            const v = Math.max(0, Math.min(10, Number(e.target.value) || 0))
                            setReactionDelay(v)
                        }}
                    />
                    <span className="settings-unit">s</span>
                </div>
            </div>
            <div className="settings-row">
                <label className="settings-label">
                    Flash Only
                    <span className="settings-hint">Only Show Flash Timers</span>
                </label>
                <button
                    className={`title-btn${showFlashOnly ? ' lock-btn active' : ''}`}
                    onClick={() => setShowFlashOnly(!showFlashOnly)}
                    style={{ width: 'auto', padding: '0 8px', fontSize: '12px' }}
                >
                    {showFlashOnly ? 'ON' : 'OFF'}
                </button>
            </div>
            <div className="settings-row">
                <label className="settings-label">
                    Debug
                    <span className="settings-hint">Show Clipboard Preview Text</span>
                </label>
                <button
                    className={`title-btn${debug ? ' lock-btn active' : ''}`}
                    onClick={() => setDebug(!debug)}
                    style={{ width: 'auto', padding: '0 8px', fontSize: '12px' }}
                >
                    {debug ? 'ON' : 'OFF'}
                </button>
            </div>

            <div className="settings-tips">
                <div className="settings-tips-title">Shortcuts</div>
                <div>Hold <kbd>Tab</kbd> to View/Hide Overlay</div>
                <div><kbd>Right Click</kbd> to Reset Timer</div>
                <div><kbd>Ctrl + V</kbd> to Paste</div>
            </div>
        </div>
    )
}
