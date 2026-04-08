import type { Position, EnemyState, SpellName } from '../types'
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

/** Short labels for clipboard output */
const SPELL_SHORT: Record<SpellName, string> = {
    Flash: 'F',
    Ignite: 'Ign',
    Teleport: 'TP',
    Heal: 'Heal',
    Ghost: 'Gho',
    Exhaust: 'Exh',
    Cleanse: 'Cle',
    Barrier: 'Bar',
    Smite: 'Smi',
    Clarity: 'Cla',
}

interface FormatTimerOptions {
    flashOnly: boolean
    includeSpellSuffix: boolean
}

function formatTimers(
    enemies: Record<Position, EnemyState>,
    options: FormatTimerOptions,
): string {
    const now = Date.now()
    const parts: string[] = []

    for (const pos of POSITIONS) {
        const label = POSITION_LABELS[pos]
        const enemy = enemies[pos]

        for (const slot of [enemy.spell1, enemy.spell2]) {
            if (!slot.active || slot.endsAt <= now) continue
            if (options.flashOnly && slot.spellName !== 'Flash') continue

            const suffix = options.includeSpellSuffix
                ? `(${SPELL_SHORT[slot.spellName]})`
                : ''

            if (slot.comebackGameTime !== null) {
                parts.push(`${formatTime(slot.comebackGameTime)}${label}${suffix}`)
            } else {
                const remaining = Math.max(
                    0,
                    Math.ceil((slot.endsAt - now) / 1000),
                )
                if (remaining > 0) {
                    parts.push(`${formatTime(remaining)}${label}${suffix}`)
                }
            }

            if (options.flashOnly) break
        }
    }

    return parts.join(' ')
}

/**
 * Format active timers as a single clipboard string.
 * showFlashOnly=true  → only Flash, e.g. "15:25Top 20:00Mid"
 * showFlashOnly=false → all spells, e.g. "15:25Top(F) 12:00Mid(TP)"
 */
export function formatAllTimers(
    enemies: Record<Position, EnemyState>,
    showFlashOnly: boolean = true,
): string {
    return formatTimers(enemies, {
        flashOnly: showFlashOnly,
        includeSpellSuffix: !showFlashOnly,
    })
}

/**
 * Clipboard output is always Flash-only and never shows a spell suffix.
 * Example: "15:25Top 20:00Mid"
 */
export function formatClipboardTimers(
    enemies: Record<Position, EnemyState>,
): string {
    return formatTimers(enemies, {
        flashOnly: true,
        includeSpellSuffix: false,
    })
}
