import { useTimerStore } from '../store/timerStore'

interface SettingsPanelProps {
    onClose: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
    const reactionDelay = useTimerStore((s) => s.reactionDelay)
    const setReactionDelay = useTimerStore((s) => s.setReactionDelay)

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <span className="settings-title">Settings</span>
                <button className="title-btn" onClick={onClose} title="Close settings">×</button>
            </div>
            <div className="settings-row">
                <label className="settings-label">
                    Reaction delay
                    <span className="settings-hint">Seconds subtracted from CD to compensate reaction time</span>
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

            <div className="settings-tips">
                <div className="settings-tips-title">Shortcuts</div>
                <div>Hold <kbd>Tab</kbd> to View/Hide Overlay</div>
                <div><kbd>Right Click</kbd> to Reset Timer</div>
                <div><kbd>Ctrl + V</kbd> to Paste</div>
            </div>
        </div>
    )
}
