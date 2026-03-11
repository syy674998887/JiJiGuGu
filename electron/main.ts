import {
    app,
    BrowserWindow,
    ipcMain,
    globalShortcut,
    clipboard,
    Tray,
    Menu,
    nativeImage,
} from 'electron'
import https from 'node:https'
import path from 'node:path'
import Store from 'electron-store'
import { sendInputText, isTabDown } from './sendInput'

const store = new Store({
    defaults: {
        windowX: null as number | null,
        windowY: null as number | null,
        screenLocked: false,
    },
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isScreenLocked = store.get('screenLocked', false) as boolean

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
}

app.on('second-instance', () => {
    if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()
    }
})

function createWindow() {
    const savedX = store.get('windowX', null) as number | null
    const savedY = store.get('windowY', null) as number | null

    mainWindow = new BrowserWindow({
        width: 500,
        height: 780,
        ...(savedX !== null && savedY !== null ? { x: savedX, y: savedY } : {}),
        transparent: true,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        focusable: false,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    // Set always-on-top level
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Re-enforce always-on-top every 5 seconds
    setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver')
        }
    }, 5000)

    // Apply initial screen lock state
    if (isScreenLocked) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true })
    }

    // Save window position on move (debounced)
    let moveTimeout: NodeJS.Timeout | null = null
    mainWindow.on('moved', () => {
        if (moveTimeout) clearTimeout(moveTimeout)
        moveTimeout = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const [x, y] = mainWindow.getPosition()
                store.set('windowX', x)
                store.set('windowY', y)
            }
        }, 300)
    })

    // Load app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// ---------- IPC Handlers ----------

ipcMain.handle('copy-to-clipboard', (_event, text: string) => {
    clipboard.writeText(text)
})


ipcMain.handle('get-player-list', async () => {
    return fetchLeagueAPI('/liveclientdata/playerlist')
})

ipcMain.handle('get-game-stats', async () => {
    return fetchLeagueAPI('/liveclientdata/gamestats')
})

ipcMain.handle('get-active-player', async () => {
    return fetchLeagueAPI('/liveclientdata/activeplayername')
})

ipcMain.handle('get-all-game-data', async () => {
    const data = await fetchLeagueAPI('/liveclientdata/allgamedata') as Record<string, unknown> | null
    if (data && typeof data === 'object') {
        const ap = data.activePlayer as Record<string, unknown> | undefined
        const players = data.allPlayers as Array<Record<string, unknown>> | undefined
        console.log('[LeagueAPI] activePlayer keys:', ap ? Object.keys(ap).join(',') : 'null')
        console.log('[LeagueAPI] activePlayer.summonerName:', ap?.summonerName)
        console.log('[LeagueAPI] activePlayer.riotId:', ap?.riotId)
        console.log('[LeagueAPI] allPlayers count:', Array.isArray(players) ? players.length : 0)
        if (players && players.length > 0) {
            const p0 = players[0]
            console.log('[LeagueAPI] player[0] keys:', Object.keys(p0).join(','))
            console.log('[LeagueAPI] player[0] summonerName:', p0.summonerName, 'team:', p0.team, 'champion:', p0.championName)
        }
        const gd = data.gameData as Record<string, unknown> | undefined
        console.log('[LeagueAPI] gameData:', gd ? JSON.stringify(gd).substring(0, 200) : 'null')

        // Log team breakdown and spells
        if (players && players.length > 0) {
            const teams: Record<string, number> = {}
            for (const p of players) {
                const t = String(p.team || 'UNKNOWN')
                teams[t] = (teams[t] || 0) + 1
            }
            console.log('[LeagueAPI] teams:', JSON.stringify(teams))

            // Find enemy team (not same as activePlayer)
            const myTeam = players.find((p: Record<string, unknown>) =>
                p.summonerName === ap?.summonerName || p.riotId === ap?.riotId
            )?.team
            console.log('[LeagueAPI] myTeam:', myTeam)

            const enemies = players.filter((p: Record<string, unknown>) => p.team !== myTeam)
            console.log('[LeagueAPI] enemies count:', enemies.length)
            for (const e of enemies) {
                console.log(`[LeagueAPI] enemy: ${e.championName} position="${e.position}" team=${e.team}`)
            }
        }
    }
    return data
})

ipcMain.on('save-position', (_event, pos: { x: number; y: number }) => {
    store.set('windowX', pos.x)
    store.set('windowY', pos.y)
})

ipcMain.on('toggle-screen-lock', () => {
    isScreenLocked = !isScreenLocked
    store.set('screenLocked', isScreenLocked)
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (isScreenLocked) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true })
        } else {
            mainWindow.setIgnoreMouseEvents(false)
        }
        mainWindow.webContents.send('screen-lock-changed', isScreenLocked)
    }
})

ipcMain.handle('get-screen-lock', () => {
    return isScreenLocked
})

ipcMain.on('set-window-size', (_event, width: number, height: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setSize(width, height)
    }
})

// Renderer can temporarily override click-through (for hover interaction while locked)
ipcMain.on('set-ignore-mouse', (_event, ignore: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (ignore) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true })
        } else {
            mainWindow.setIgnoreMouseEvents(false)
        }
    }
})

ipcMain.on('close-window', () => {
    app.quit()
})

ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.hide()
})

// Toggle in-game features based on game state (driven by renderer's useGameDetect)
ipcMain.on('set-in-game', (_event, inGame: boolean) => {
    if (inGame) {
        enableInGameFeatures()
    } else {
        disableInGameFeatures()
    }
})

// ---------- League Client API ----------

function fetchLeagueAPI(endpoint: string): Promise<unknown> {
    return new Promise((resolve) => {
        const req = https.get(
            `https://127.0.0.1:2999${endpoint}`,
            { rejectUnauthorized: false, timeout: 2000 },
            (res) => {
                let data = ''
                res.on('data', (chunk: string) => (data += chunk))
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data)
                        console.log(`[LeagueAPI] ${endpoint} OK, keys:`,
                            typeof parsed === 'object' && parsed !== null
                                ? Object.keys(parsed).join(',')
                                : typeof parsed)
                        resolve(parsed)
                    } catch {
                        console.log(`[LeagueAPI] ${endpoint} parse error, raw:`, data.substring(0, 200))
                        resolve(null)
                    }
                })
            },
        )
        req.on('error', (err) => {
            console.log(`[LeagueAPI] ${endpoint} error:`, err.message)
            resolve(null)
        })
        req.on('timeout', () => {
            console.log(`[LeagueAPI] ${endpoint} timeout`)
            req.destroy()
            resolve(null)
        })
    })
}

// ---------- In-game features (Ctrl+V override + Tab hold overlay) ----------

let ctrlVRegistered = false
let tabPollTimer: NodeJS.Timeout | null = null
let tabWasDown = false
let isInGame = false

function enableInGameFeatures() {
    if (isInGame) return
    isInGame = true

    // Ctrl+V: intercept paste, type via SendInput
    if (!ctrlVRegistered) {
        globalShortcut.register('CommandOrControl+V', () => {
            const text = clipboard.readText()
            if (text) sendInputText(text)
        })
        ctrlVRegistered = true
    }

    // Tab hold: show overlay while held, hide on release
    // Hide overlay by default when entering game
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide()
    }
    tabWasDown = false
    tabPollTimer = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        const tabDown = isTabDown()
        if (tabDown && !tabWasDown) {
            mainWindow.showInactive()
        } else if (!tabDown && tabWasDown) {
            mainWindow.hide()
        }
        tabWasDown = tabDown
    }, 50)

    console.log('[InGame] Features enabled')
}

function disableInGameFeatures() {
    if (!isInGame) return
    isInGame = false

    // Unregister Ctrl+V
    if (ctrlVRegistered) {
        globalShortcut.unregister('CommandOrControl+V')
        ctrlVRegistered = false
    }

    // Stop Tab polling, show overlay normally
    if (tabPollTimer) {
        clearInterval(tabPollTimer)
        tabPollTimer = null
    }
    tabWasDown = false
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
    }

    console.log('[InGame] Features disabled')
}

function registerShortcuts() {
    // Ctrl+Shift+L: Toggle screen lock
    globalShortcut.register('Ctrl+Shift+L', () => {
        ipcMain.emit('toggle-screen-lock')
    })
}

// ---------- System Tray ----------

function createTray() {
    const iconPath = path.join(__dirname, '../build/logo.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
    tray.setToolTip('JiJiGuGu Overlay')

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show / Hide',
            click: () => {
                if (!mainWindow) return
                if (mainWindow.isVisible()) {
                    mainWindow.hide()
                } else {
                    mainWindow.show()
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => app.quit(),
        },
    ])
    tray.setContextMenu(contextMenu)

    tray.on('double-click', () => {
        if (!mainWindow) return
        if (mainWindow.isVisible()) {
            mainWindow.hide()
        } else {
            mainWindow.show()
        }
    })
}

// ---------- App Lifecycle ----------

app.whenReady().then(() => {
    createWindow()
    createTray()
    registerShortcuts()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
    app.quit()
})
