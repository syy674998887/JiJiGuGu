import { useEffect, useRef } from 'react'
import { useTimerStore } from '../store/timerStore'
import { parseEnemies } from '../services/gameData'
import { API_POLL_INTERVAL } from '../constants/config'
import type { PlayerData } from '../types'

/**
 * Hook that polls League Live Client API to detect game state and enemy info.
 * Uses /allgamedata (same as league-spell-tracker) for reliable detection.
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

    // Notify main process when in-game state changes (for Ctrl+V override)
    useEffect(() => {
        if (isInGame !== prevInGameRef.current) {
            prevInGameRef.current = isInGame
            window.electronAPI.setInGame(isInGame)
        }
    }, [isInGame])

    useEffect(() => {
        let active = true

        async function poll() {
            if (!active) return

            try {
                // Use allgamedata — same approach as league-spell-tracker
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data: any = await window.electronAPI.getAllGameData()

                if (!active) return

                if (!data || !data.allPlayers) {
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

                // Extract data — match league-spell-tracker's field access pattern
                const allPlayers: PlayerData[] = data.allPlayers
                const gameTime: number = data.gameData?.gameTime ?? 0

                // Get active player name from the response
                // allgamedata.activePlayer has summonerName and riotId
                const activePlayerName: string =
                    data.activePlayer?.summonerName ||
                    data.activePlayer?.riotId ||
                    ''

                // New game detection: gameTime regression
                if (
                    prevGameTimeRef.current !== null &&
                    gameTime < prevGameTimeRef.current - 30
                ) {
                    clearAllTimers()
                    prevEnemiesRef.current = ''
                    prevRosterRef.current = ''
                }

                prevGameTimeRef.current = gameTime
                setGameState(true, gameTime)

                if (!activePlayerName || allPlayers.length === 0) return

                // Parse enemies — same as league-spell-tracker
                const parsed = parseEnemies(allPlayers, activePlayerName)

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
