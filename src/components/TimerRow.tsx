import type { Position, EnemyState } from '../types'
import { POSITION_LABELS } from '../constants/config'
import { useTimerStore } from '../store/timerStore'
import SpellButton from './SpellButton'

interface TimerRowProps {
    position: Position
    enemy: EnemyState
}

export default function TimerRow({ position, enemy }: TimerRowProps) {
    const showFlashOnly = useTimerStore((s) => s.showFlashOnly)

    // Determine which spells to display
    let spellSlots: Array<{ slot: 'spell1' | 'spell2' }> = []

    if (showFlashOnly) {
        // Flash can be on either D or F — find whichever slot has it
        if (enemy.spell1.spellName === 'Flash') {
            spellSlots = [{ slot: 'spell1' }]
        } else if (enemy.spell2.spellName === 'Flash') {
            spellSlots = [{ slot: 'spell2' }]
        }
        // If neither has Flash, show nothing for this row
    } else {
        spellSlots = [{ slot: 'spell1' }, { slot: 'spell2' }]
    }

    // Hide row entirely if flash-only mode and no Flash on this enemy
    if (showFlashOnly && spellSlots.length === 0) return null

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
                {spellSlots.map(({ slot }) => (
                    <SpellButton key={slot} position={position} slot={slot} spell={enemy[slot]} />
                ))}
            </div>
        </div>
    )
}

