import type { Position, EnemyState } from '../types'
import { POSITION_LABELS } from '../constants/config'
import SpellButton from './SpellButton'

interface TimerRowProps {
    position: Position
    enemy: EnemyState
}

export default function TimerRow({ position, enemy }: TimerRowProps) {
    return (
        <div className="timer-row">
            {enemy.championIconUrl && (
                <div className="timer-row-avatar">
                    <img
                        className="champion-icon"
                        src={enemy.championIconUrl}
                        alt={enemy.championName}
                        draggable={false}
                    />
                </div>
            )}

            <span className="timer-row-label">{POSITION_LABELS[position]}</span>

            <div className="timer-row-spells">
                <SpellButton position={position} slot="spell1" spell={enemy.spell1} />
                <SpellButton position={position} slot="spell2" spell={enemy.spell2} />
            </div>
        </div>
    )
}
