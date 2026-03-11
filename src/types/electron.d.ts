export interface ElectronAPI {
    copyToClipboard: (text: string) => Promise<void>
    getPlayerList: () => Promise<import('./index').PlayerData[] | null>
    getGameStats: () => Promise<import('./index').GameStats | null>
    getActivePlayer: () => Promise<string | null>
    getAllGameData: () => Promise<import('./index').AllGameData | null>
    savePosition: (pos: { x: number; y: number }) => void
    closeApp: () => void
    minimizeApp: () => void
    toggleScreenLock: () => void
    getScreenLock: () => Promise<boolean>
    onScreenLockChanged: (callback: (locked: boolean) => void) => () => void
    setWindowSize: (width: number, height: number) => void
    setIgnoreMouseEvents: (ignore: boolean) => void
    setInGame: (inGame: boolean) => void
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
