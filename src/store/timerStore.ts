import { create } from 'zustand'
import type {
    TimerStore,
    Position,
    SpellSlot,
    SpellTimer,
    ParsedEnemy,
    SpellName,
} from '../types'
import { POSITIONS, SPELL_COOLDOWNS, REACTION_COMPENSATION } from '../constants/config'
import { calcCooldown } from '../utils/spells'
import { getChampionIconUrl } from '../utils/icons'

function createDefaultSpellTimer(spellName: SpellName = 'Flash'): SpellTimer {
    return {
        active: false,
        spellName,
        baseCooldown: SPELL_COOLDOWNS[spellName],
        actualCooldown: SPELL_COOLDOWNS[spellName],
        endsAt: 0,
        comebackGameTime: null,
    }
}

function createDefaultEnemies(): Record<Position, import('../types').EnemyState> {
    const enemies = {} as Record<Position, import('../types').EnemyState>
    for (const pos of POSITIONS) {
        enemies[pos] = {
            championName: '',
            championIconUrl: '',
            haste: 0,
            spell1: createDefaultSpellTimer('Flash'),
            spell2: createDefaultSpellTimer('Ignite'),
        }
    }
    return enemies
}

function recalcTimerForHaste(
    spell: SpellTimer,
    oldHaste: number,
    newHaste: number,
    currentGameTime: number | null,
    reactionDelay: number,
): SpellTimer {
    if (!spell.active || spell.endsAt <= Date.now()) return spell

    const oldCd = Math.max(1, calcCooldown(spell.baseCooldown, oldHaste) - reactionDelay)
    const newCd = Math.max(1, calcCooldown(spell.baseCooldown, newHaste) - reactionDelay)

    const now = Date.now()
    const remainingMs = spell.endsAt - now
    const totalMs = oldCd * 1000
    const pctRemaining = totalMs > 0 ? remainingMs / totalMs : 0

    const newRemainingMs = pctRemaining * newCd * 1000
    const newEndsAt = now + newRemainingMs
    const newRemainingSeconds = newRemainingMs / 1000

    let newComebackGameTime: number | null = null
    if (currentGameTime !== null) {
        newComebackGameTime = Math.floor(currentGameTime + newRemainingSeconds)
    }

    return {
        ...spell,
        actualCooldown: newCd,
        endsAt: newEndsAt,
        comebackGameTime: newComebackGameTime,
    }
}

export const useTimerStore = create<TimerStore>((set, get) => ({
    enemies: createDefaultEnemies(),
    isInGame: false,
    gameTime: null,
    reactionDelay: REACTION_COMPENSATION,
    showFlashOnly: true,
    debug: false,
    apiKeyStatus: 'checking',
    riotApiKey: '',

    startTimer: async (pos: Position, slot: SpellSlot): Promise<void> => {
        let gameTime: number | null = null
        try {
            const stats = await window.electronAPI.getGameStats()
            if (stats && typeof stats.gameTime === 'number') {
                gameTime = stats.gameTime
            }
        } catch {
            // API not available
        }

        const state = get()
        const enemy = state.enemies[pos]
        const spell = enemy[slot]

        const baseCd = SPELL_COOLDOWNS[spell.spellName] || 300
        const afterHaste = calcCooldown(baseCd, enemy.haste)
        const actualCd = Math.max(0, afterHaste - state.reactionDelay)

        const endsAt = Date.now() + actualCd * 1000
        const comebackGameTime =
            gameTime !== null ? Math.floor(gameTime) + actualCd : null

        set((prev) => ({
            enemies: {
                ...prev.enemies,
                [pos]: {
                    ...prev.enemies[pos],
                    [slot]: {
                        ...prev.enemies[pos][slot],
                        active: true,
                        baseCooldown: baseCd,
                        actualCooldown: actualCd,
                        endsAt,
                        comebackGameTime,
                    },
                },
            },
        }))
    },

    resetTimer: (pos: Position, slot: SpellSlot) => {
        set((prev) => ({
            enemies: {
                ...prev.enemies,
                [pos]: {
                    ...prev.enemies[pos],
                    [slot]: {
                        ...prev.enemies[pos][slot],
                        active: false,
                        endsAt: 0,
                        comebackGameTime: null,
                    },
                },
            },
        }))
    },

    adjustTimer: (pos: Position, slot: SpellSlot, seconds: number) => {
        set((prev) => {
            const spell = prev.enemies[pos][slot]
            if (!spell.active) return prev

            const newEndsAt = Math.max(Date.now(), spell.endsAt + seconds * 1000)
            const newComebackGameTime =
                spell.comebackGameTime !== null
                    ? spell.comebackGameTime + seconds
                    : null

            return {
                enemies: {
                    ...prev.enemies,
                    [pos]: {
                        ...prev.enemies[pos],
                        [slot]: {
                            ...spell,
                            endsAt: newEndsAt,
                            comebackGameTime: newComebackGameTime,
                        },
                    },
                },
            }
        })
    },

    updateEnemies: (parsedEnemies: ParsedEnemy[]) => {
        set((prev) => {
            const newEnemies = { ...prev.enemies }

            for (const parsed of parsedEnemies) {
                const pos = parsed.position
                const existing = prev.enemies[pos]

                const preserveTimers =
                    existing.championName === parsed.championName &&
                    existing.championName !== ''

                let spell1Timer: SpellTimer
                let spell2Timer: SpellTimer

                if (preserveTimers) {
                    const hasteChanged = existing.haste !== parsed.haste
                    spell1Timer = {
                        ...existing.spell1,
                        spellName: parsed.spell1,
                        baseCooldown: SPELL_COOLDOWNS[parsed.spell1],
                    }
                    spell2Timer = {
                        ...existing.spell2,
                        spellName: parsed.spell2,
                        baseCooldown: SPELL_COOLDOWNS[parsed.spell2],
                    }
                    if (hasteChanged) {
                        spell1Timer = recalcTimerForHaste(spell1Timer, existing.haste, parsed.haste, prev.gameTime, prev.reactionDelay)
                        spell2Timer = recalcTimerForHaste(spell2Timer, existing.haste, parsed.haste, prev.gameTime, prev.reactionDelay)
                    }
                } else {
                    spell1Timer = createDefaultSpellTimer(parsed.spell1)
                    spell2Timer = createDefaultSpellTimer(parsed.spell2)
                }

                newEnemies[pos] = {
                    championName: parsed.championName,
                    championIconUrl: getChampionIconUrl(parsed.championName),
                    haste: parsed.haste,
                    spell1: spell1Timer,
                    spell2: spell2Timer,
                }
            }

            return { enemies: newEnemies }
        })
    },

    setGameState: (inGame: boolean, gameTime: number | null) => {
        set({ isInGame: inGame, gameTime })
    },

    swapPositions: (posA: Position, posB: Position) => {
        set((prev) => {
            const newEnemies = { ...prev.enemies }
            const temp = newEnemies[posA]
            newEnemies[posA] = newEnemies[posB]
            newEnemies[posB] = temp
            return { enemies: newEnemies }
        })
    },

    clearAllTimers: () => {
        set({ enemies: createDefaultEnemies() })
    },

    setReactionDelay: (seconds: number) => {
        set({ reactionDelay: seconds })
        window.electronAPI.saveSetting('reactionDelay', seconds)
    },

    setDebug: (on: boolean) => {
        set({ debug: on })
        window.electronAPI.saveSetting('debug', on)
    },

    setShowFlashOnly: (on: boolean) => {
        set({ showFlashOnly: on })
        window.electronAPI.saveSetting('showFlashOnly', on)
    },

    setApiKeyStatus: (status) => {
        set({ apiKeyStatus: status })
    },

    setRiotApiKey: async (key: string) => {
        set({ apiKeyStatus: 'checking', riotApiKey: key })
        try {
            const status = await window.electronAPI.setRiotApiKey(key)
            set({ apiKeyStatus: status })
        } catch {
            set({ apiKeyStatus: 'invalid' })
        }
    },

    loadSettings: async () => {
        try {
            const s = await window.electronAPI.getSettings()
            set({
                reactionDelay: s.reactionDelay,
                debug: s.debug,
                showFlashOnly: s.showFlashOnly ?? true,
                riotApiKey: s.riotApiKey ?? '',
            })
        } catch {
            // use defaults
        }

        // Listen for future status pushes from main process
        window.electronAPI.onApiKeyStatus((status) => {
            set({ apiKeyStatus: status as import('../types/electron').ApiKeyStatus })
        })

        // Actively validate on startup (don't rely on main process push timing)
        try {
            const status = await window.electronAPI.validateRiotApiKey()
            set({ apiKeyStatus: status })
        } catch {
            set({ apiKeyStatus: 'invalid' })
        }
    },
}))
