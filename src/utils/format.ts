import type { Position, EnemyState } from '../types'
import { POSITIONS } from '../constants/config'

/** "TOP" → "Top", "JG" → "Jng", "ADC" → "Bot" etc. */
function capitalizePos(pos: Position): string {
    if (pos === 'JG') return 'Jng'
    if (pos === 'ADC') return 'Bot'
    return pos[0] + pos.slice(1).toLowerCase()
}

/**
 * Format comeback game time as "MM:SS" string.
 * e.g. 925 seconds (15:25) → "15:25"
 *      1200 seconds (20:00) → "20:00"
 */
export function formatComebackTime(gameTimeSeconds: number): string {
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format a single timer as clipboard text.
 * e.g. "15:25Top"
 */
export function formatTimerText(
    position: Position,
    comebackGameTime: number | null,
    remainingSeconds: number,
): string {
    const label = capitalizePos(position)
    if (comebackGameTime !== null) {
        return `${formatComebackTime(comebackGameTime)}${label}`
    }
    const m = Math.floor(remainingSeconds / 60)
    const s = remainingSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}${label}`
}

/**
 * Format all active Flash timers as a single clipboard string.
 * e.g. "15:25Top 20:00Mid 18:30Sup"
 */
export function formatAllTimers(
    enemies: Record<Position, EnemyState>,
): string {
    const now = Date.now()
    const parts: string[] = []
    for (const pos of POSITIONS) {
        const label = capitalizePos(pos)
        const enemy = enemies[pos]
        for (const slot of [enemy.spell1, enemy.spell2]) {
            if (
                slot.active &&
                slot.spellName === 'Flash' &&
                slot.endsAt > now
            ) {
                if (slot.comebackGameTime !== null) {
                    parts.push(
                        `${formatComebackTime(slot.comebackGameTime)}${label}`,
                    )
                } else {
                    const remaining = Math.max(
                        0,
                        Math.ceil((slot.endsAt - now) / 1000),
                    )
                    if (remaining > 0) {
                        const m = Math.floor(remaining / 60)
                        const s = remaining % 60
                        parts.push(
                            `${m}:${s.toString().padStart(2, '0')}${label}`,
                        )
                    }
                }
                break
            }
        }
    }
    return parts.join(' ')
}
