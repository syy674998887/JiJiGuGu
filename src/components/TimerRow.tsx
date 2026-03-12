import type { Position, EnemyState } from '../types'
import SpellButton from './SpellButton'

const DISPLAY_NAME: Record<Position, string> = {
    TOP: 'Top', JG: 'Jng', MID: 'Mid', ADC: 'Bot', SUP: 'Sup',
}

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

            <span className="timer-row-label">{DISPLAY_NAME[position]}</span>

            <div className="timer-row-spells">
                <SpellButton position={position} slot="spell1" spell={enemy.spell1} />
                <SpellButton position={position} slot="spell2" spell={enemy.spell2} />
            </div>
        </div>
    )
}
