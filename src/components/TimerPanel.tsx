import { POSITIONS } from '../constants/config'
import TimerRow from './TimerRow'

export default function TimerPanel() {
    return (
        <div className="timer-panel">
            {POSITIONS.map((pos) => (
                <TimerRow key={pos} position={pos} />
            ))}
        </div>
    )
}
