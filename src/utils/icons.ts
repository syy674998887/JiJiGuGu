import { DDRAGON_VERSION } from '../constants/config'

/**
 * Get champion icon URL from Data Dragon CDN.
 * Name must match DDragon format (e.g. "Ahri", "LeeSin", "KSante")
 */
export function getChampionIconUrl(championName: string): string {
    if (!championName) return ''
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png`
}

/**
 * Get summoner spell icon URL from Data Dragon CDN.
 * Uses the full spell key (e.g. "SummonerFlash", "SummonerDot")
 */
export function getSpellIconUrl(spellKey: string): string {
    if (!spellKey) return ''
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/spell/${spellKey}.png`
}

/** Map friendly spell names to DDragon spell keys */
export const SPELL_ICON_KEYS: Record<string, string> = {
    Flash: 'SummonerFlash',
    Ignite: 'SummonerDot',
    Teleport: 'SummonerTeleport',
    Heal: 'SummonerHeal',
    Ghost: 'SummonerHaste',
    Exhaust: 'SummonerExhaust',
    Cleanse: 'SummonerBoost',
    Barrier: 'SummonerBarrier',
    Smite: 'SummonerSmite',
    Clarity: 'SummonerMana',
}
