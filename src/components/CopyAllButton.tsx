import { useTimerStore } from '../store/timerStore'
import { useTickingTimer } from '../hooks/useTickingTimer'
import { formatAllTimers } from '../utils/format'

export default function CopyAllButton() {
    useTickingTimer()
    const enemies = useTimerStore((s) => s.enemies)
    const previewText = formatAllTimers(enemies)

    if (!previewText) return null

    return (
        <div className="copy-all-section">
            <span className="copy-all-preview">{previewText}</span>
        </div>
    )
}
