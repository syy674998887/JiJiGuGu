import type { Position, SpellName } from '../types'

/** Data Dragon CDN version */
export const DDRAGON_VERSION = '16.5.1'

/** Reaction time compensation in seconds (subtracted from CD) */
export const REACTION_COMPENSATION = 0

/** API polling interval in ms */
export const API_POLL_INTERVAL = 3000

/** Summoner spell base cooldowns in seconds (Data Dragon 16.5.1 verified) */
export const SPELL_COOLDOWNS: Record<SpellName, number> = {
    Flash: 300,
    Ignite: 180,
    Teleport: 300,
    Heal: 240,
    Ghost: 240,
    Exhaust: 240,
    Cleanse: 240,
    Barrier: 180,
    Smite: 15,
    Clarity: 240,
}

/** Item IDs that grant summoner spell haste */
export const ITEM_HASTE: Record<number, number> = {
    3158: 10, // Ionian Boots of Lucidity
    3171: 20, // Crimson Lucidity (upgraded)
}

/** Ordered positions for display */
export const POSITIONS: Position[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP']

/** Display labels for each position */
export const POSITION_LABELS: Record<Position, string> = {
    TOP: 'Top', JG: 'Jng', MID: 'Mid', ADC: 'Bot', SUP: 'Sup',
}

