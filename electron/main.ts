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
import dotenv from 'dotenv'
import { sendInputText, isTabDown, isKeyDown } from './sendInput'
import { setApiKey, fetchEnemyRuneHaste } from './riotApi'

dotenv.config()

const store = new Store({
    defaults: {
        windowX: null as number | null,
        windowY: null as number | null,
        screenLocked: false,
        reactionDelay: 0,
        debug: false,
    },
})

// Initialize Riot API key from .env
setApiKey(process.env.RIOT_API_KEY || '')

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
        height: 100,
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

ipcMain.handle('get-enemy-rune-haste', async (_event, activePlayerName: string, allPlayers: unknown[]) => {
    return fetchEnemyRuneHaste(activePlayerName, allPlayers as Parameters<typeof fetchEnemyRuneHaste>[1])
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

ipcMain.handle('get-settings', () => {
    return {
        reactionDelay: store.get('reactionDelay', 0) as number,
        debug: store.get('debug', false) as boolean,
    }
})

ipcMain.on('save-setting', (_event, key: string, value: unknown) => {
    if (key === 'reactionDelay' || key === 'debug') {
        store.set(key, value)
    }
})

ipcMain.on('set-window-size', (_event, width: number, height: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setResizable(true)
        mainWindow.setSize(width, height)
        mainWindow.setResizable(false)
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
                        resolve(JSON.parse(data))
                    } catch {
                        resolve(null)
                    }
                })
            },
        )
        req.on('error', () => resolve(null))
        req.on('timeout', () => {
            req.destroy()
            resolve(null)
        })
    })
}

// ---------- In-game features (Ctrl+V override + Tab hold overlay) ----------

let tabPollTimer: NodeJS.Timeout | null = null
let ctrlVPollTimer: NodeJS.Timeout | null = null
let tabWasDown = false
let vWasDown = false
let isInGame = false

const VK_CONTROL = 0x11
const VK_V = 0x56

function enableInGameFeatures() {
    if (isInGame) return
    isInGame = true

    // Ctrl+V: poll for keypress, type via SendInput (polling bypasses game privilege restrictions)
    vWasDown = false
    ctrlVPollTimer = setInterval(() => {
        const vDown = isKeyDown(VK_V)
        if (isKeyDown(VK_CONTROL) && vDown && !vWasDown) {
            const text = clipboard.readText()
            if (text) sendInputText(text)
        }
        vWasDown = vDown
    }, 50)

    // Tab hold: show overlay while held, hide on release
    // Use opacity instead of hide/show to avoid Windows DWM flicker
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(0)
    }
    tabWasDown = false
    tabPollTimer = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        const tabDown = isTabDown()
        if (tabDown && !tabWasDown) {
            mainWindow.setOpacity(1)
        } else if (!tabDown && tabWasDown) {
            mainWindow.setOpacity(0)
        }
        tabWasDown = tabDown
    }, 50)

    console.log('[InGame] Features enabled')
}

function disableInGameFeatures() {
    if (!isInGame) return
    isInGame = false

    // Stop Ctrl+V polling
    if (ctrlVPollTimer) {
        clearInterval(ctrlVPollTimer)
        ctrlVPollTimer = null
    }

    // Stop Tab polling, show overlay normally
    if (tabPollTimer) {
        clearInterval(tabPollTimer)
        tabPollTimer = null
    }
    tabWasDown = false
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(1)
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
    tray.setToolTip('JiJiGuGu')

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
