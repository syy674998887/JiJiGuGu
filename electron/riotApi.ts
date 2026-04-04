/**
 * Riot Games API integration for fetching spectator data (enemy runes).
 * Uses spectator-v5 to get perkIds for all players in a live game.
 */
import https from 'node:https'

const COSMIC_INSIGHT_ID = 8347
const COSMIC_INSIGHT_HASTE = 18

const ACCOUNT_REGION = 'americas.api.riotgames.com'
const PLATFORM = 'na1.api.riotgames.com'

let apiKey = ''

export function setApiKey(key: string) {
    apiKey = key.trim()
}

export function getApiKey(): string {
    return apiKey
}

/**
 * Validate the current API key by hitting a lightweight endpoint.
 * Returns 'valid' | 'invalid' | 'empty'.
 */
export function validateApiKey(): Promise<'valid' | 'invalid' | 'empty'> {
    return new Promise((resolve) => {
        if (!apiKey) { resolve('empty'); return }
        const req = https.get(`https://${PLATFORM}/lol/status/v4/platform-data`, {
            headers: { 'X-Riot-Token': apiKey },
            timeout: 5000,
        }, (res) => {
            // Drain data to avoid memory leak
            res.resume()
            if (res.statusCode === 200) {
                resolve('valid')
            } else {
                // 401 = bad key, 403 = expired/forbidden
                resolve('invalid')
            }
        })
        req.on('error', () => resolve('invalid'))
        req.on('timeout', () => { req.destroy(); resolve('invalid') })
    })
}

function riotGet(host: string, path: string): Promise<unknown> {
    return new Promise((resolve) => {
        if (!apiKey) { resolve(null); return }
        const req = https.get(`https://${host}${path}`, {
            headers: { 'X-Riot-Token': apiKey },
            timeout: 5000,
        }, (res) => {
            let data = ''
            res.on('data', (chunk: string) => (data += chunk))
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch {
                    resolve(null)
                }
            })
        })
        req.on('error', () => resolve(null))
        req.on('timeout', () => { req.destroy(); resolve(null) })
    })
}

async function getPuuid(gameName: string, tagLine: string): Promise<string | null> {
    const data = await riotGet(
        ACCOUNT_REGION,
        `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    ) as { puuid?: string } | null
    return data?.puuid ?? null
}

async function getSpectatorData(puuid: string): Promise<unknown> {
    return riotGet(PLATFORM, `/lol/spectator/v5/active-games/by-summoner/${puuid}`)
}

/**
 * Fetch enemy rune haste for the current game.
 * Returns a map of riotId → runeHaste (18 if Cosmic Insight, 0 otherwise).
 */
export async function fetchEnemyRuneHaste(
    activePlayerName: string,
    allPlayers: Array<{ riotIdGameName?: string; riotIdTagLine?: string; riotId?: string; summonerName?: string }>,
): Promise<Record<string, number>> {
    const result: Record<string, number> = {}

    // Find active player's riot ID
    const activePlayer = allPlayers.find(
        (p) => p.summonerName === activePlayerName || p.riotId === activePlayerName,
    )
    if (!activePlayer) return result

    let gameName = activePlayer.riotIdGameName || ''
    let tagLine = activePlayer.riotIdTagLine || ''
    if (!gameName && activePlayer.riotId) {
        const parts = activePlayer.riotId.split('#')
        gameName = parts[0] || ''
        tagLine = parts[1] || ''
    }
    if (!gameName || !tagLine) return result

    const puuid = await getPuuid(gameName, tagLine)
    if (!puuid) {
        console.log('[RiotAPI] Failed to get PUUID for', gameName, tagLine)
        return result
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gameData = await getSpectatorData(puuid) as any
    if (!gameData || !gameData.participants) {
        console.log('[RiotAPI] Failed to get spectator data')
        return result
    }

    // Find my team
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myTeamId = gameData.participants.find((p: any) => p.puuid === puuid)?.teamId

    // Check each enemy for Cosmic Insight, key by riotId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const participant of gameData.participants) {
        if (participant.teamId === myTeamId) continue

        const perkIds: number[] = participant.perks?.perkIds || []
        const runeHaste = perkIds.includes(COSMIC_INSIGHT_ID) ? COSMIC_INSIGHT_HASTE : 0
        const riotId = participant.riotId || ''
        if (riotId) {
            result[riotId] = runeHaste
        }
    }

    console.log('[RiotAPI] Enemy rune haste:', result)
    return result
}
