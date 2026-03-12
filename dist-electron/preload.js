"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  getPlayerList: () => electron.ipcRenderer.invoke("get-player-list"),
  getGameStats: () => electron.ipcRenderer.invoke("get-game-stats"),
  getActivePlayer: () => electron.ipcRenderer.invoke("get-active-player"),
  getAllGameData: () => electron.ipcRenderer.invoke("get-all-game-data"),
  savePosition: (pos) => electron.ipcRenderer.send("save-position", pos),
  closeApp: () => electron.ipcRenderer.send("close-window"),
  minimizeApp: () => electron.ipcRenderer.send("minimize-window"),
  toggleScreenLock: () => electron.ipcRenderer.send("toggle-screen-lock"),
  getScreenLock: () => electron.ipcRenderer.invoke("get-screen-lock"),
  onScreenLockChanged: (callback) => {
    const handler = (_event, locked) => callback(locked);
    electron.ipcRenderer.on("screen-lock-changed", handler);
    return () => {
      electron.ipcRenderer.removeListener("screen-lock-changed", handler);
    };
  },
  setWindowSize: (width, height) => electron.ipcRenderer.send("set-window-size", width, height),
  setIgnoreMouseEvents: (ignore) => electron.ipcRenderer.send("set-ignore-mouse", ignore),
  setInGame: (inGame) => electron.ipcRenderer.send("set-in-game", inGame),
  getEnemyRuneHaste: (activePlayerName, allPlayers) => electron.ipcRenderer.invoke("get-enemy-rune-haste", activePlayerName, allPlayers)
});
//# sourceMappingURL=preload.js.map
