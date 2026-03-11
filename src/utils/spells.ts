/**
 * Calculate total summoner spell haste from item haste values.
 */
export function computeHaste(itemHaste: number): number {
    return itemHaste
}

/**
 * Calculate actual cooldown after haste reduction.
 * Formula: cd = floor(baseCd * 100 / (100 + haste))
 */
export function calcCooldown(baseCooldown: number, haste: number): number {
    if (haste <= 0) return baseCooldown
    return Math.floor((baseCooldown * 100) / (100 + haste))
}

/**
 * Format seconds as "M:SS" string.
 */
export function formatTime(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0:00'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
