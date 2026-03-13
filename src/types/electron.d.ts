export interface ElectronAPI {
    copyToClipboard: (text: string) => Promise<void>
    getPlayerList: () => Promise<import('./index').PlayerData[] | null>
    getGameStats: () => Promise<import('./index').GameStats | null>
    getActivePlayer: () => Promise<string | null>
    minimizeApp: () => void
    toggleScreenLock: () => void
    getScreenLock: () => Promise<boolean>
    getSettings: () => Promise<{ reactionDelay: number; debug: boolean }>
    saveSetting: (key: string, value: unknown) => void
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
