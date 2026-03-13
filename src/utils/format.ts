import type { Position, EnemyState } from '../types'
import { POSITIONS, POSITION_LABELS } from '../constants/config'

/**
 * Format seconds as "M:SS" string.
 */
export function formatTime(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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
        const label = POSITION_LABELS[pos]
        const enemy = enemies[pos]
        for (const slot of [enemy.spell1, enemy.spell2]) {
            if (
                slot.active &&
                slot.spellName === 'Flash' &&
                slot.endsAt > now
            ) {
                if (slot.comebackGameTime !== null) {
                    parts.push(
                        `${formatTime(slot.comebackGameTime)}${label}`,
                    )
                } else {
                    const remaining = Math.max(
                        0,
                        Math.ceil((slot.endsAt - now) / 1000),
                    )
                    if (remaining > 0) {
                        parts.push(
                            `${formatTime(remaining)}${label}`,
                        )
                    }
                }
                break
            }
        }
    }
    return parts.join(' ')
}
