import type { PlayerData, ParsedEnemy, SpellName, Position } from '../types'
import { ITEM_HASTE } from '../constants/config'

/**
 * Normalize spell name using includes() matching — same approach as league-spell-tracker.
 * Works with ANY format:
 *   "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"
 *   "SummonerFlash"
 *   "Flash"
 *   "闪现" (Chinese)
 */
export function cleanSpellName(displayName: string, rawDisplayName?: string): SpellName {
    // Combine both for matching
    const raw = ((rawDisplayName || '') + ' ' + (displayName || '')).toLowerCase()

    // Match by keyword — order matters (check specific before generic)
    if (raw.includes('flash') || raw.includes('闪现')) return 'Flash'
    if (raw.includes('teleport') || raw.includes('传送')) return 'Teleport'
    if (raw.includes('ignite') || raw.includes('dot') || raw.includes('引燃') || raw.includes('点燃')) return 'Ignite'
    if (raw.includes('heal') || raw.includes('治疗')) return 'Heal'
    if (raw.includes('exhaust') || raw.includes('虚弱')) return 'Exhaust'
    if (raw.includes('barrier') || raw.includes('屏障')) return 'Barrier'
    if (raw.includes('cleanse') || raw.includes('boost') || raw.includes('净化')) return 'Cleanse'
    if (raw.includes('ghost') || raw.includes('haste') || raw.includes('疾跑')) return 'Ghost'
    if (raw.includes('smite') || raw.includes('惩戒') || raw.includes('重击')) return 'Smite'
    if (raw.includes('clarity') || raw.includes('mana') || raw.includes('清晰')) return 'Clarity'

    return 'Flash' // Default fallback
}

/**
 * Calculate total summoner spell haste from player items.
 */
function calcItemHaste(items: Array<{ itemID: number }>): number {
    let haste = 0
    for (const item of items) {
        if (ITEM_HASTE[item.itemID]) {
            haste += ITEM_HASTE[item.itemID]
        }
    }
    return haste
}

/**
 * Get English champion name for DDragon URL.
 * rawChampionName: "game_character_displayname_Gragas" → "Gragas"
 * championName might be localized (e.g. "古拉格斯") — NOT usable for DDragon.
 */
function getEnglishChampionName(player: PlayerData): string {
    // rawChampionName is always English: "game_character_displayname_Ahri"
    const raw = player.rawChampionName || ''
    if (raw.includes('_')) {
        const parts = raw.split('_')
        return parts[parts.length - 1]
    }
    // Fallback: championName (might be localized, but better than nothing)
    return player.championName || ''
}

/** Helper: parse one enemy's spells */
function parseSpellsFromEnemy(enemy: PlayerData): { spell1: SpellName; spell2: SpellName } {
    return {
        spell1: cleanSpellName(
            enemy.summonerSpells.summonerSpellOne.displayName,
            enemy.summonerSpells.summonerSpellOne.rawDisplayName,
        ),
        spell2: cleanSpellName(
            enemy.summonerSpells.summonerSpellTwo.displayName,
            enemy.summonerSpells.summonerSpellTwo.rawDisplayName,
        ),
    }
}

/**
 * Parse enemy team from playerlist response.
 * Returns 5 parsed enemies with position assignment.
 * runeHasteMap: riotId → extra haste from runes (e.g. Cosmic Insight +18)
 */
export function parseEnemies(
    playerList: PlayerData[],
    activePlayerName: string,
    runeHasteMap: Record<string, number> = {},
): ParsedEnemy[] {
    // Find active player's team
    const activePlayer = playerList.find(
        (p) =>
            p.summonerName === activePlayerName ||
            p.riotId === activePlayerName,
    )
    const myTeam = activePlayer?.team ?? 'ORDER'

    const enemies = playerList.filter((p) => p.team !== myTeam)
    if (enemies.length === 0) return []

    // Position assignment: Smite holder → JG, rest by array order → TOP/MID/ADC/SUP
    const nonJgPositions: Position[] = ['TOP', 'MID', 'ADC', 'SUP']
    const result: ParsedEnemy[] = []
    let jgAssigned = false
    const remaining: PlayerData[] = []

    function getHaste(enemy: PlayerData): number {
        const itemHaste = calcItemHaste(enemy.items)
        const riotId = enemy.riotId || ''
        const runeHaste = runeHasteMap[riotId] || 0
        return itemHaste + runeHaste
    }

    for (const enemy of enemies) {
        const { spell1, spell2 } = parseSpellsFromEnemy(enemy)
        if (!jgAssigned && (spell1 === 'Smite' || spell2 === 'Smite')) {
            result.push({
                position: 'JG',
                championName: getEnglishChampionName(enemy),
                spell1,
                spell2,
                haste: getHaste(enemy),
            })
            jgAssigned = true
        } else {
            remaining.push(enemy)
        }
    }

    let posIdx = 0
    for (const enemy of remaining) {
        if (posIdx >= nonJgPositions.length) break
        const { spell1, spell2 } = parseSpellsFromEnemy(enemy)
        result.push({
            position: nonJgPositions[posIdx],
            championName: getEnglishChampionName(enemy),
            spell1,
            spell2,
            haste: getHaste(enemy),
        })
        posIdx++
    }

    if (!jgAssigned && remaining.length > posIdx) {
        const enemy = remaining[posIdx]
        const { spell1, spell2 } = parseSpellsFromEnemy(enemy)
        result.push({
            position: 'JG',
            championName: getEnglishChampionName(enemy),
            spell1,
            spell2,
            haste: getHaste(enemy),
        })
    }

    const posOrder: Record<Position, number> = { TOP: 0, JG: 1, MID: 2, ADC: 3, SUP: 4 }
    result.sort((a, b) => posOrder[a.position] - posOrder[b.position])

    return result
}
