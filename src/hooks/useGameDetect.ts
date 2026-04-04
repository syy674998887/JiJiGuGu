import { useEffect, useRef } from 'react'
import { useTimerStore } from '../store/timerStore'
import { parseEnemies } from '../services/gameData'
import { API_POLL_INTERVAL } from '../constants/config'
import type { PlayerData } from '../types'

/**
 * Hook that polls League Live Client API to detect game state and enemy info.
 * Uses sub-endpoints (playerlist + gamestats + activeplayername) instead of
 * allgamedata to reduce payload size (~15-20KB vs 30-200KB).
 */
export function useGameDetect() {
    const setGameState = useTimerStore((s) => s.setGameState)
    const updateEnemies = useTimerStore((s) => s.updateEnemies)
    const clearAllTimers = useTimerStore((s) => s.clearAllTimers)
    const isInGame = useTimerStore((s) => s.isInGame)

    const failCountRef = useRef(0)
    const prevEnemiesRef = useRef<string>('')
    const prevRosterRef = useRef<string>('')
    const prevGameTimeRef = useRef<number | null>(null)
    const prevInGameRef = useRef(false)
    const runeHasteRef = useRef<Record<string, number>>({})
    const runeHasteFetchedRef = useRef(false)

    const setApiKeyStatus = useTimerStore((s) => s.setApiKeyStatus)

    // Notify main process when in-game state changes (for Ctrl+V override)
    useEffect(() => {
        if (isInGame !== prevInGameRef.current) {
            prevInGameRef.current = isInGame
            window.electronAPI.setInGame(isInGame)
            if (isInGame) {
                // Validate API key when entering a game
                window.electronAPI.validateRiotApiKey().then((status) => {
                    setApiKeyStatus(status)
                })
            } else {
                // Reset rune haste when leaving game
                runeHasteRef.current = {}
                runeHasteFetchedRef.current = false
            }
        }
    }, [isInGame, setApiKeyStatus])

    useEffect(() => {
        let active = true

        async function poll() {
            if (!active) return

            try {
                // Fetch sub-endpoints in parallel (~15-20KB total vs 30-200KB for allgamedata)
                const [playerList, gameStats, activePlayerName] = await Promise.all([
                    window.electronAPI.getPlayerList(),
                    window.electronAPI.getGameStats(),
                    window.electronAPI.getActivePlayer() as Promise<string | null>,
                ])

                if (!active) return

                if (!playerList || !Array.isArray(playerList) || playerList.length === 0) {
                    failCountRef.current++
                    if (failCountRef.current >= 5) {
                        setGameState(false, null)
                        clearAllTimers()
                        prevEnemiesRef.current = ''
                        prevRosterRef.current = ''
                        prevGameTimeRef.current = null
                    }
                    return
                }

                failCountRef.current = 0

                const allPlayers: PlayerData[] = playerList as PlayerData[]
                const gameTime: number = (gameStats as any)?.gameTime ?? 0

                // New game detection: gameTime regression
                if (
                    prevGameTimeRef.current !== null &&
                    gameTime < prevGameTimeRef.current - 30
                ) {
                    clearAllTimers()
                    prevEnemiesRef.current = ''
                    prevRosterRef.current = ''
                    runeHasteRef.current = {}
                    runeHasteFetchedRef.current = false
                }

                prevGameTimeRef.current = gameTime
                setGameState(true, gameTime)

                if (!activePlayerName) return

                // Fetch enemy rune haste once per game via Riot API
                if (!runeHasteFetchedRef.current) {
                    runeHasteFetchedRef.current = true
                    try {
                        const haste = await (window.electronAPI as any).getEnemyRuneHaste(activePlayerName, allPlayers)
                        if (haste && typeof haste === 'object') {
                            runeHasteRef.current = haste
                        }
                    } catch {
                        // Riot API not available, continue without rune haste
                    }
                }

                // Parse enemies with rune haste
                const parsed = parseEnemies(allPlayers, activePlayerName, runeHasteRef.current)

                if (parsed.length === 0) return

                // Roster change detection
                const rosterKey = parsed.map((e) => e.championName).sort().join(',')
                if (prevRosterRef.current !== '' && rosterKey !== prevRosterRef.current) {
                    clearAllTimers()
                }
                prevRosterRef.current = rosterKey

                // Detail change detection (haste + spells)
                const enemyKey = JSON.stringify(
                    parsed.map((e) => `${e.championName}:${e.haste}:${e.spell1}:${e.spell2}`),
                )
                if (enemyKey !== prevEnemiesRef.current) {
                    prevEnemiesRef.current = enemyKey
                    updateEnemies(parsed)
                }
            } catch {
                failCountRef.current++
                if (failCountRef.current >= 5) {
                    setGameState(false, null)
                    clearAllTimers()
                    prevEnemiesRef.current = ''
                    prevRosterRef.current = ''
                    prevGameTimeRef.current = null
                }
            }
        }

        poll()
        const interval = setInterval(poll, API_POLL_INTERVAL)

        return () => {
            active = false
            clearInterval(interval)
        }
    }, [setGameState, updateEnemies, clearAllTimers])

    return { isInGame }
}
