import type { Position, EnemyState } from '../types'
import SpellButton from './SpellButton'
import AdjustButtons from './AdjustButtons'

interface TimerRowProps {
    position: Position
    enemy: EnemyState
}

export default function TimerRow({ position, enemy }: TimerRowProps) {
    const spell1Active = enemy.spell1.active && enemy.spell1.endsAt > Date.now()
    const spell2Active = enemy.spell2.active && enemy.spell2.endsAt > Date.now()

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

            <span className="timer-row-label">{position}</span>

            <div className="timer-row-spells">
                <SpellButton position={position} slot="spell1" spell={enemy.spell1} />
                <SpellButton position={position} slot="spell2" spell={enemy.spell2} />
            </div>

            <div className="timer-row-adjusts">
                {spell1Active && (
                    <AdjustButtons position={position} slot="spell1" active={true} />
                )}
                {spell2Active && (
                    <AdjustButtons position={position} slot="spell2" active={true} />
                )}
            </div>
        </div>
    )
}
