/** 5 enemy positions */
export type Position = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP'

/** Spell slot (each enemy has 2 summoner spells) */
export type SpellSlot = 'spell1' | 'spell2'

/** Summoner spell names */
export type SpellName =
    | 'Flash'
    | 'Ignite'
    | 'Teleport'
    | 'Heal'
    | 'Ghost'
    | 'Exhaust'
    | 'Cleanse'
    | 'Barrier'
    | 'Smite'
    | 'Clarity'

/** Single spell timer state */
export interface SpellTimer {
    active: boolean
    spellName: SpellName
    baseCooldown: number
    actualCooldown: number
    endsAt: number // Date.now() timestamp when spell comes back
    comebackGameTime: number | null // game seconds (e.g. 925 = 15:25), null if API unavailable
}

/** Single enemy position state */
export interface EnemyState {
    championName: string
    championIconUrl: string
    haste: number
    spell1: SpellTimer
    spell2: SpellTimer
}

/** Zustand store interface */
export interface TimerStore {
    enemies: Record<Position, EnemyState>
    isInGame: boolean
    gameTime: number | null
    reactionDelay: number
    debug: boolean
    showFlashOnly: boolean
    apiKeyStatus: import('./electron').ApiKeyStatus
    riotApiKey: string

    startTimer: (pos: Position, slot: SpellSlot) => Promise<void>
    resetTimer: (pos: Position, slot: SpellSlot) => void
    adjustTimer: (pos: Position, slot: SpellSlot, seconds: number) => void
    updateEnemies: (data: ParsedEnemy[]) => void
    setGameState: (inGame: boolean, gameTime: number | null) => void
    swapPositions: (posA: Position, posB: Position) => void
    clearAllTimers: () => void
    setReactionDelay: (seconds: number) => void
    setDebug: (on: boolean) => void
    setShowFlashOnly: (on: boolean) => void
    setApiKeyStatus: (status: import('./electron').ApiKeyStatus) => void
    setRiotApiKey: (key: string) => Promise<void>
    validateCurrentRiotApiKey: (reason?: string) => Promise<void>
    loadSettings: () => Promise<void>
}

/** Parsed enemy from League API */
export interface ParsedEnemy {
    position: Position
    championName: string
    spell1: SpellName
    spell2: SpellName
    haste: number
}

/** League Live Client API — playerlist response item */
export interface PlayerData {
    championName: string
    team: 'ORDER' | 'CHAOS'
    summonerSpells: {
        summonerSpellOne: { displayName: string; rawDisplayName: string }
        summonerSpellTwo: { displayName: string; rawDisplayName: string }
    }
    items: Array<{ itemID: number }>
    rawChampionName: string
    summonerName: string
    riotId: string
}

/** League Live Client API — gamestats response */
export interface GameStats {
    gameTime: number
    gameMode: string
}
