import { useTimerStore } from '../store/timerStore'
import { POSITIONS } from '../constants/config'
import TimerRow from './TimerRow'

export default function TimerPanel() {
    const enemies = useTimerStore((s) => s.enemies)

    return (
        <div className="timer-panel">
            {POSITIONS.map((pos) => (
                <TimerRow key={pos} position={pos} enemy={enemies[pos]} />
            ))}
        </div>
    )
}
