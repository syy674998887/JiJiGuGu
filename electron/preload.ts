import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

    getPlayerList: () => ipcRenderer.invoke('get-player-list'),
    getGameStats: () => ipcRenderer.invoke('get-game-stats'),
    getActivePlayer: () => ipcRenderer.invoke('get-active-player'),

    minimizeApp: () => ipcRenderer.send('minimize-window'),

    toggleScreenLock: () => ipcRenderer.send('toggle-screen-lock'),
    getScreenLock: () => ipcRenderer.invoke('get-screen-lock'),

    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSetting: (key: string, value: unknown) =>
        ipcRenderer.send('save-setting', key, value),
    onScreenLockChanged: (callback: (locked: boolean) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, locked: boolean) =>
            callback(locked)
        ipcRenderer.on('screen-lock-changed', handler)
        return () => {
            ipcRenderer.removeListener('screen-lock-changed', handler)
        }
    },

    setWindowSize: (width: number, height: number) =>
        ipcRenderer.send('set-window-size', width, height),

    setIgnoreMouseEvents: (ignore: boolean) =>
        ipcRenderer.send('set-ignore-mouse', ignore),

    setInGame: (inGame: boolean) =>
        ipcRenderer.send('set-in-game', inGame),

    getEnemyRuneHaste: (activePlayerName: string, allPlayers: unknown[]) =>
        ipcRenderer.invoke('get-enemy-rune-haste', activePlayerName, allPlayers),

    setRiotApiKey: (key: string) =>
        ipcRenderer.invoke('set-riot-api-key', key),

    validateRiotApiKey: () =>
        ipcRenderer.invoke('validate-riot-api-key'),

    onApiKeyStatus: (callback: (status: string) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, status: string) =>
            callback(status)
        ipcRenderer.on('api-key-status', handler)
        return () => {
            ipcRenderer.removeListener('api-key-status', handler)
        }
    },
})

