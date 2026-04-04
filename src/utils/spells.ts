/**
 * Calculate actual cooldown after haste reduction.
 * Formula: cd = floor(baseCd * 100 / (100 + haste))
 */
export function calcCooldown(baseCooldown: number, haste: number): number {
    if (haste <= 0) return baseCooldown
    return Math.floor((baseCooldown * 100) / (100 + haste))
}
