# JiJiGuGu Overlay — 项目方案文档

> LoL Flash Timer & Quick Chat Overlay
> 版本: v1.0 方案
> 日期: 2026-03-11

---

## 一、项目概述

### 1.1 目标

为英雄联盟玩家打造一个轻量级桌面 Overlay 工具，解决两个核心痛点：

1. **记 Flash 太麻烦** — 看到敌方交闪后，手动记时间、算CD、打字告诉队友，流程繁琐
2. **打字交流太慢** — 常用指令（打龙、插眼、集合）每次都要手打，影响操作

### 1.2 核心工作流

```
敌方TOP交闪 → 点击 Overlay 上 TOP 的 Flash 按钮
  → 自动从游戏 API 获取当前时间（如 10:25）
  → 自动计算回来时间 10:25 + 5:00 = 15:25
  → 自动减去反应延迟 3 秒
  → 自动计算装备急速（如对方出了离子之靴）
  → 剪贴板写入 "TOP 1525"
  → 游戏内按 Enter → Ctrl+V → Enter 发送

需要告诉队友打龙 → 点击 [dragon] 按钮
  → 剪贴板写入 "help dragon"
  → 游戏内粘贴发送
```

---

## 二、技术栈

| 技术 | 版本 | 用途 | 来源 |
|------|------|------|------|
| Electron | ^28 | 桌面应用框架，透明 overlay 窗口 | lol-cd-tracker |
| React | ^18 | UI 组件化 | lol-cd-tracker |
| TypeScript | ^5.2 | 类型安全 | lol-cd-tracker |
| Vite | ^5.0 | 构建工具，HMR 开发体验 | lol-cd-tracker |
| vite-plugin-electron | | Electron + Vite 集成 | lol-cd-tracker |
| Zustand | ^5 | 轻量状态管理 | LolTimeFlash |
| electron-store | ^8 | 配置持久化（窗口位置、用户设置） | 新增 |
| electron-builder | | 打包 Windows exe | lol-cd-tracker |

---

## 三、功能清单

### 3.1 核心功能

| # | 功能 | 描述 | 借鉴来源 |
|---|------|------|---------|
| F1 | Flash 计时 | 5个位置各2个技能槽，点击开始倒计时 | lol-cd-tracker SpellSlot |
| F2 | 自动复制到剪贴板 | 点击即复制 "TOP 1525" 格式到剪贴板 | PasteLikeDoinb 工作流 |
| F3 | 游戏时间获取 | 连接 League Live Client API (`gamestats`) 获取实时游戏时间 | PasteLikeDoinb main.js |
| F4 | 自动敌方检测 | API (`playerlist`) 自动识别敌方英雄名 + 召唤师技能 + 装备；位置按数组顺序分配（Smite→JG），支持手动调换 | league-spell-tracker + LolTimeFlash |
| F5 | 装备急速自动计算 | 读取敌方装备自动计算技能急速，调整 CD | league-spell-tracker config.js + cooldown-manager.js |
| F6 | 反应延迟补偿 | 自动减去 3 秒（可配置），补偿看到技能到点击的延迟 | LolTimeFlash cooldowns.ts |
| F7 | 计时微调 | ±2秒按钮，手动修正计时偏差 | LolTimeFlash game.service.ts adjustFlashTimer |
| F8 | 快捷话术 | 9个预设短语按钮，一键复制 | 新功能 |
| F9 | 一键复制全部 | 复制所有活跃计时 "TOP 1525 MID 2000 SUP 1830" | 新功能 |

### 3.2 Overlay 功能

| # | 功能 | 描述 | 借鉴来源 |
|---|------|------|---------|
| O1 | 透明置顶窗口 | transparent + alwaysOnTop + focusable:false | league-spell-tracker main.js |
| O2 | 全局热键切换 | Alt+T 显示/隐藏 overlay | lol-cd-tracker (Ctrl+Shift+L 改为 Alt+T) |
| O3 | 窗口位置锁定 | 📌 按钮锁定/解锁拖动 | lol-cd-tracker TitleBar.tsx |
| O4 | 窗口位置持久化 | 关闭后记住位置，下次打开恢复 | league-spell-tracker main.js config.json |
| O5 | 防覆盖机制 | 每 5 秒重新 setAlwaysOnTop | league-spell-tracker main.js |
| O6 | 系统托盘 | 最小化到托盘，右键菜单 | league-spell-tracker main.js |
| O7 | 锁定时点击穿透 | 锁定后 `setIgnoreMouseEvents(true, {forward:true})`，鼠标事件穿透到游戏 | league-spell-tracker main.js |

---

## 四、借鉴映射表

### 4.1 从 lol-cd-tracker 复用（~45%）

> 项目骨架 + 组件模式 + Hooks + 样式主题

| 源文件 | → 目标文件 | 复用方式 |
|--------|-----------|---------|
| `vite.config.ts` | → `vite.config.ts` | **原样复制** |
| `tsconfig.json` | → `tsconfig.json` | **原样复制** |
| `tsconfig.node.json` | → `tsconfig.node.json` | **原样复制** |
| `index.html` | → `index.html` | **原样复制** |
| `package.json` | → `package.json` | 复制结构，加 zustand 依赖 |
| `electron/main.ts` | → `electron/main.ts` | **复用骨架**：BrowserWindow 配置、globalShortcut 注册、IPC 框架、setAlwaysOnTop 定时重置。注意：league-spell-tracker 使用 nodeIntegration:true / contextIsolation:false 的不安全模式，本项目必须保持 lol-cd-tracker 的安全模式（contextIsolation:true） |
| `electron/preload.ts` | → `electron/preload.ts` | **复用骨架**：contextBridge 模式，扩展新方法 |
| `src/main.tsx` | → `src/main.tsx` | **原样复制** |
| `src/electron.d.ts` | → `src/types/electron.d.ts` | 复用声明模式，扩展新 API 类型 |
| `src/hooks/useTimer.ts` | → `src/hooks/useTickingTimer.ts` | **参考重写**：原版是 setInterval 递减器，与 endsAt 时间戳方案冲突。改为基于 Store 的 endsAt + 全局 1s ticker 驱动 UI 更新 |
| `src/hooks/useScreenLock.ts` | → `src/hooks/useScreenLock.ts` | **直接复用**：锁定状态同步 |
| `src/utils/spells.ts` | → `src/utils/spells.ts` | **直接复用**：`computeHaste()`, `calcCooldown()`, `formatTime()` |
| `src/components/TitleBar.tsx` | → `src/components/TitleBar.tsx` | **直接复用**：拖动、锁定按钮、关闭按钮 |
| `src/components/SpellSlot.tsx` | → `src/components/SpellButton.tsx` | **重构复用**：三态(idle/cooldown/ready)、点击交互、倒计时显示 |
| `src/components/EnemyCard.tsx` | → `src/components/TimerRow.tsx` | **参考结构**：位置标签 + 技能槽布局 |
| `src/components/SpellSelector.tsx` | → `src/components/SpellButton.tsx` 内 | **参考**：技能选择下拉（在自动检测不可用时手动选择的后备方案） |
| `src/index.css` | → `src/styles/index.css` | **复用主题**：深色配色、gold 强调色、overlay 样式基础 |

### 4.2 从 league-spell-tracker 移植（~25%）

> API 集成层 + 敌方自动检测 + 英雄/技能图标 + 窗口细节配置

| 源文件 | → 目标文件 | 移植内容 |
|--------|-----------|---------|
| `src/api.js` | → `electron/main.ts` IPC handler | `fetchPlayerList()`: HTTPS GET `127.0.0.1:2999/liveclientdata/playerlist`；`fetchGameStats()`: HTTPS GET `127.0.0.1:2999/liveclientdata/gamestats`。使用子端点替代 allgamedata，rejectUnauthorized:false，timeout:1000 |
| `src/game-data.js` → `parseEnemies()` | → `src/services/gameData.ts` | 队伍识别（ORDER/CHAOS）→ 过滤敌方 → 提取英雄名（处理下划线）→ 提取两个召唤师技能 → 计算装备急速总和 → **位置分配**：Smite 持有者→JG，其余按数组顺序→TOP/MID/ADC/SUP [LolTimeFlash riot-role-mapping.util.ts] |
| `src/game-data.js` → `cleanSpellName()` | → `src/services/gameData.ts` | 技能名规范化：处理 API 返回的各种格式 → 映射为标准 SummonerXXX 名称 |
| `src/config.js` → `SPELL_COOLDOWNS` | → `src/constants/config.ts` | 全部召唤师技能基础 CD（已按 Data Dragon 16.5.1 校正）：Flash 300, Ignite 180, TP 300, Heal 240, Ghost 240, Exhaust 240, Cleanse 240, Barrier 180, Smite 15, Clarity 240 |
| `src/config.js` → `ITEM_HASTE` | → `src/constants/config.ts` | 装备急速映射：3158(离子之靴)→10, 3171(升级版)→20。注意：物品 ID 可能随版本变化，建议启动时从 Data Dragon item.json 校验 |
| `src/config.js` → `DDRAGON_VERSION` | → `src/constants/config.ts` | Data Dragon CDN 版本号 |
| `src/cooldown-manager.js` → 急速公式 | → `src/utils/spells.ts`（已有） | `cd = Math.floor(cd × 100 / (100 + haste))` — 已在 lol-cd-tracker 的 spells.ts 中实现 |
| `src/cooldown-manager.js` → save/restore | → `src/store/timerStore.ts` | 敌方信息变化时保存计时状态 → 重建 UI 后恢复（防止 API 刷新导致计时丢失） |
| `main.js` → `set-ignore-mouse` IPC | → `electron/main.ts` | `setIgnoreMouseEvents(ignore, {forward:true})` 锁定时鼠标穿透 |
| `src/ui-builder.js` → icon URL 生成 | → `src/utils/icons.ts` | `getChampionIconUrl(name)` → `https://ddragon.leagueoflegends.com/cdn/{ver}/img/champion/{name}.png` |
| | | `getSpellIconUrl(name)` → `https://ddragon.leagueoflegends.com/cdn/{ver}/img/spell/{name}.png` |
| `main.js` → 窗口配置 | → `electron/main.ts` | `focusable:false`, `skipTaskbar:true`, 系统托盘创建, 单实例锁 `app.requestSingleInstanceLock()` |
| `main.js` → 配置持久化 | → 改用 `electron-store` | 替代手写 config.json 读写，自动处理路径、序列化、默认值 |

### 4.3 从 LolTimeFlash 吸收（~15%）

> 状态管理模式 + 计算常量 + 微调逻辑 + 最佳实践

| 源文件/逻辑 | → 目标文件 | 借鉴内容 |
|-------------|-----------|---------|
| `cooldowns.ts` → 常量 | → `src/constants/config.ts` | `REACTION_TIME_COMPENSATION = 3`（秒），自动从 CD 中减去 |
| `game.service.ts` → `useFlash()` | → `src/store/timerStore.ts` | 时间戳方案：存储 `endsAt`（绝对时间戳）而非递减计数器。优势：无网络延迟不同步问题 |
| `game.service.ts` → `adjustFlashTimer()` | → `src/store/timerStore.ts` | `adjustTimer(pos, slot, seconds)`: 将 endsAt 加减指定秒数，防止负数 |
| `game.service.ts` → `toggleItem()` | → `src/store/timerStore.ts` | 切换装备时重算：保持已过冷却百分比不变，基于新 CD 重新计算 endsAt |
| `role-card.component.tsx` | → `src/components/TimerRow.tsx` | UI 参考：位置标签 + 英雄头像 + Flash 按钮 + 微调按钮的行布局 |
| Zustand 状态模式 | → `src/store/timerStore.ts` | 用 Zustand `create()` 管理全局状态，替代 lol-cd-tracker 的 React Context |

### 4.4 从 PasteLikeDoinb 借鉴（~8%）

> 剪贴板通信工作流 + API 端点补充

| 源逻辑 | → 目标实现 | 借鉴内容 |
|--------|-----------|---------|
| 剪贴板→粘贴工作流 | → 整体设计 | 核心交互范式：工具自动复制 → 用户在游戏内 Ctrl+V。比 robotjs 更轻量，无需管理员权限 |
| `main.js` → API 端点 | → `electron/main.ts` | 补充 `gamestats` 端点获取游戏时间（league-spell-tracker 只用了 allgamedata） |
| `main.js` → 消息格式 | → `src/utils/format.ts` | 位置+时间拼接格式："TOP 1525"，多个拼接："TOP 1525 MID 2000" |
| `main.js` → 等级查询 | → `src/services/gameData.ts` | 可选：获取敌方英雄等级用于 TP 精确 CD 计算 |

### 4.5 从 LoL_Summoner_Tracker 借鉴（~3%）

> 交互细节

| 源逻辑 | → 目标实现 | 借鉴内容 |
|--------|-----------|---------|
| 右键 contextmenu 重置 | → `SpellButton.tsx` | `onContextMenu` → 重置计时器，不启动新计时 |
| 亮/暗双状态图标 | → `src/styles/index.css` | CSS `filter: brightness(0.4)` 实现冷却中图标变暗 |
| 100ms 更新频率 | → 参考但不采用 | 我们用 1 秒间隔即可（Flash CD 以秒为单位，无需亚秒精度） |

### 4.6 新增代码（~4%）

| 新文件 | 功能 |
|--------|------|
| `src/components/CopyAllButton.tsx` | 复制所有活跃计时器，预览当前文本 |
| `src/components/ChatPanel.tsx` | 快捷话术面板容器 |
| `src/components/ChatButton.tsx` | 单个话术按钮，点击复制 |
| `src/components/Toast.tsx` | 底部浮动提示 "Copied: TOP 1525"，2 秒后消失 |
| `src/components/AdjustButtons.tsx` | ±2 秒微调按钮 |
| `src/utils/format.ts` | `formatComebackTime()`: 秒数 → "1525" 格式 |
| `src/hooks/useGameDetect.ts` | 轮询 API 自动检测游戏状态和敌方信息 |
| `src/hooks/useClipboard.ts` | 封装 electronAPI.copyToClipboard + Toast 触发 |

---

## 五、文件结构

```
jjgg-overlay/
│
├── package.json                         # [lol-cd-tracker] + zustand
├── vite.config.ts                       # [lol-cd-tracker] 原样
├── tsconfig.json                        # [lol-cd-tracker] 原样
├── tsconfig.node.json                   # [lol-cd-tracker] 原样
├── index.html                           # [lol-cd-tracker] 原样
│
├── electron/
│   ├── main.ts                          # [lol-cd-tracker] 骨架
│   │                                    # + [league-spell-tracker] 窗口配置/托盘/API
│   │                                    # + [PasteLikeDoinb] 剪贴板 IPC
│   └── preload.ts                       # [lol-cd-tracker] 骨架 + 扩展
│
├── src/
│   ├── main.tsx                         # [lol-cd-tracker] 原样
│   ├── App.tsx                          # [lol-cd-tracker] 参考重写
│   │
│   ├── types/
│   │   ├── electron.d.ts               # [lol-cd-tracker] 扩展
│   │   └── index.ts                     # 共享类型定义
│   │
│   ├── constants/
│   │   └── config.ts                    # [league-spell-tracker] config.js
│   │                                    # + [LolTimeFlash] cooldowns.ts
│   │                                    # 合并: API端点/技能CD/装备急速/DDragon版本/延迟补偿
│   │
│   ├── services/
│   │   ├── api.ts                       # [league-spell-tracker] api.js → TS
│   │   └── gameData.ts                  # [league-spell-tracker] game-data.js → TS
│   │                                    #   parseEnemies() + cleanSpellName()
│   │
│   ├── store/
│   │   └── timerStore.ts                # [LolTimeFlash] Zustand 模式
│   │                                    #   5位置×2技能槽状态
│   │                                    #   startTimer / resetTimer / adjustTimer
│   │                                    # + [league-spell-tracker] save/restore 逻辑
│   │
│   ├── hooks/
│   │   ├── useTickingTimer.ts           # [lol-cd-tracker] 参考重写为 endsAt + ticker
│   │   ├── useScreenLock.ts             # [lol-cd-tracker] 直接复用
│   │   ├── useGameDetect.ts             # 新：基于 [league-spell-tracker] checkGame 循环
│   │   └── useClipboard.ts              # 新：格式化 + 复制 + Toast
│   │
│   ├── utils/
│   │   ├── spells.ts                    # [lol-cd-tracker] 直接复用
│   │   │                                #   computeHaste / calcCooldown / formatTime
│   │   ├── format.ts                    # 新：[PasteLikeDoinb] 格式思路
│   │   │                                #   formatComebackTime / formatAllTimers
│   │   └── icons.ts                     # [league-spell-tracker] ui-builder.js 提取
│   │                                    #   getChampionIconUrl / getSpellIconUrl
│   │
│   ├── components/
│   │   ├── TitleBar.tsx                 # [lol-cd-tracker] 直接复用
│   │   ├── TimerPanel.tsx               # 新：5行容器
│   │   ├── TimerRow.tsx                 # [lol-cd-tracker] EnemyCard
│   │   │                                # + [LolTimeFlash] RoleCard 布局
│   │   │                                # + [league-spell-tracker] 头像加载
│   │   ├── SpellButton.tsx              # [lol-cd-tracker] SpellSlot 重构
│   │   │                                # + [LoL_Summoner_Tracker] 右键重置/亮暗状态
│   │   ├── AdjustButtons.tsx            # [LolTimeFlash] ±2s 微调
│   │   ├── CopyAllButton.tsx            # 新
│   │   ├── ChatPanel.tsx                # 新
│   │   ├── ChatButton.tsx               # 新
│   │   └── Toast.tsx                    # 新
│   │
│   └── styles/
│       └── index.css                    # [lol-cd-tracker] 主题基础
│                                        # + [league-spell-tracker] 冷却变暗效果
│
└── PLAN.md                              # 本文档
```

---

## 六、类型定义

```typescript
// src/types/index.ts

/** 5个敌方位置 */
export type Position = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP';

/** 技能槽位（每人2个技能） */
export type SpellSlot = 'spell1' | 'spell2';

/** 召唤师技能名称 */
export type SpellName =
  | 'Flash' | 'Ignite' | 'Teleport' | 'Heal'
  | 'Ghost' | 'Exhaust' | 'Cleanse' | 'Barrier'
  | 'Smite' | 'Clarity';

/** 单个技能的计时状态 */
export interface SpellTimer {
  active: boolean;
  spellName: SpellName;
  baseCooldown: number;          // 基础 CD（秒）
  actualCooldown: number;        // 扣除急速和延迟后的实际 CD
  endsAt: number;                // Date.now() 时间戳，技能恢复时刻
  comebackGameTime: number | null; // 游戏内秒数（如 925 = 15:25），API 不可用时为 null
}

/** 单个敌方位置的状态 */
export interface EnemyState {
  championName: string;           // 英雄名（如 "Ahri"）
  championIconUrl: string;        // Data Dragon 头像 URL
  haste: number;                  // 技能急速（来自装备检测）
  spell1: SpellTimer;
  spell2: SpellTimer;
}

/** 全局应用状态（Zustand Store） */
export interface TimerStore {
  enemies: Record<Position, EnemyState>;
  isInGame: boolean;
  gameTime: number | null;

  // Actions
  startTimer: (pos: Position, slot: SpellSlot) => Promise<string>; // 返回复制的文本
  resetTimer: (pos: Position, slot: SpellSlot) => void;
  adjustTimer: (pos: Position, slot: SpellSlot, seconds: number) => void;
  updateEnemies: (data: ParsedEnemy[]) => void;
  setGameState: (inGame: boolean, gameTime: number | null) => void;
}

/** league-spell-tracker 解析后的敌方数据 */
export interface ParsedEnemy {
  position: Position;              // 按数组顺序分配（Smite→JG 优先），支持手动调换
  championName: string;
  spell1: SpellName;
  spell2: SpellName;
  haste: number;
}

/** Electron API（通过 preload 暴露） */
export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<void>;
  getPlayerList: () => Promise<PlayerData[] | null>;
  getGameStats: () => Promise<GameStats | null>;
  savePosition: (pos: { x: number; y: number }) => void;
  closeApp: () => void;
  minimizeApp: () => void;
  toggleScreenLock: () => void;
  getScreenLock: () => Promise<boolean>;
  onScreenLockChanged: (callback: (locked: boolean) => void) => void;
}

/** League Live Client API — playerlist 端点返回 */
export interface PlayerData {
  championName: string;
  team: 'ORDER' | 'CHAOS';
  summonerSpells: {
    summonerSpellOne: { displayName: string };
    summonerSpellTwo: { displayName: string };
  };
  items: Array<{ itemID: number }>;
}

/** League Live Client API — gamestats 端点返回 */
export interface GameStats {
  gameTime: number;
  gameMode: string;
}
```

---

## 七、核心模块设计

### 7.1 Electron 主进程（electron/main.ts）

**来源**: lol-cd-tracker `electron/main.ts` + league-spell-tracker `main.js`

```
职责:
├── 窗口创建
│   ├── 260×500, transparent, frameless         [lol-cd-tracker]
│   ├── alwaysOnTop: 'screen-saver'             [lol-cd-tracker]
│   ├── focusable: false                        [league-spell-tracker]
│   ├── skipTaskbar: true                       [league-spell-tracker]
│   └── 每 5 秒重新 setAlwaysOnTop              [league-spell-tracker]
│
├── 全局快捷键
│   ├── Alt+T → 切换显示/隐藏
│   └── Ctrl+Shift+L → 切换位置锁定             [lol-cd-tracker]
│
├── IPC Handlers
│   ├── 'copy-to-clipboard' → clipboard.writeText()
│   ├── 'get-player-list' → HTTPS GET playerlist  [PasteLikeDoinb]
│   ├── 'get-game-stats' → HTTPS GET gamestats    [PasteLikeDoinb]
│   ├── 'save-position' → electron-store          [league-spell-tracker → 改用 electron-store]
│   ├── 'toggle-screen-lock' → 切换锁定 + setIgnoreMouseEvents  [lol-cd-tracker + league-spell-tracker]
│   ├── 'set-window-size' → 动态调整大小          [lol-cd-tracker]
│   ├── 'close-window' → app.quit()
│   └── 'minimize-window' → win.hide()
│
├── 窗口位置
│   ├── 启动时从 electron-store 恢复位置         [league-spell-tracker → 改用 electron-store]
│   └── moved 事件防抖保存到 electron-store      [league-spell-tracker]
│
├── 系统托盘                                     [league-spell-tracker]
│   ├── 显示/隐藏
│   └── 退出
│
└── 单实例锁                                     [league-spell-tracker]
    └── app.requestSingleInstanceLock()
```

### 7.2 Zustand Store（src/store/timerStore.ts）

**来源**: LolTimeFlash 状态设计 + league-spell-tracker cooldown-manager

```
timerStore = create<TimerStore>((set, get) => ({

  enemies: {
    TOP:  { championName: '', spell1: {...}, spell2: {...}, haste: 0 },
    JG:   { ... },
    MID:  { ... },
    ADC:  { ... },
    SUP:  { ... },
  },

  startTimer(pos, slot):
    1. 获取 gameTime (via electronAPI.getGameStats)
    2. 获取该位置的 haste
    3. 计算 actualCooldown:
       base = SPELL_COOLDOWNS[spellName]                    // [league-spell-tracker]
       afterHaste = calcCooldown(base, haste)               // [lol-cd-tracker]
       afterReaction = afterHaste - REACTION_COMPENSATION    // [LolTimeFlash]
    4. 设置 endsAt = Date.now() + actualCooldown * 1000     // [LolTimeFlash] 时间戳方案
    5. 设置 comebackGameTime = gameTime + actualCooldown
    6. 格式化并返回复制文本

  resetTimer(pos, slot):
    → active = false, endsAt = 0                            // [LoL_Summoner_Tracker]

  adjustTimer(pos, slot, seconds):
    → endsAt += seconds * 1000                              // [LolTimeFlash]
    → 防止 endsAt < Date.now()（不允许负数）

  updateEnemies(parsedEnemies):                             // [league-spell-tracker]
    → 保存当前计时状态
    → 更新英雄名/技能名/急速
    → 恢复之前的计时状态（如果英雄未变）

}))
```

### 7.3 游戏检测 Hook（src/hooks/useGameDetect.ts）

**来源**: league-spell-tracker `renderer.js` 的 checkGame 循环

```
useGameDetect():
  每 3 秒轮询:
    1. electronAPI.getPlayerList() + electronAPI.getGameStats()
    2. 如果成功:
       - isInGame = true
       - parseEnemies(playerList)                           // [league-spell-tracker]
         → 位置分配：Smite 持有者→JG，其余按数组顺序→TOP/MID/ADC/SUP  // [LolTimeFlash]
         → 支持用户手动调换位置
       - 对比敌方是否变化，变化时 updateEnemies()
       - 更新 gameTime
    3. 如果失败（不在游戏中）:
       - 连续失败计数 +1
       - 短暂失败（<5次）: 保留现有计时（抗网络抖动）
       - 持续失败（≥5次）: isInGame = false
    4. 新对局检测（防止上局残留）:
       - gameTime 回退（如 25:00 → 0:30）→ 清空所有计时
       - 敌方 roster 全部变化 → 清空所有计时

  返回: { isInGame, gameTime }
```

### 7.4 组件设计

#### TimerRow（单行）

**来源**: lol-cd-tracker `EnemyCard` + LolTimeFlash `RoleCard` + league-spell-tracker UI

```
┌─────────────────────────────────────────────────────┐
│ [头像]  TOP   [⚡ 3:42 →1525]  [🔥 1:15]  [-2][+2] │
└─────────────────────────────────────────────────────┘
  │       │      │                 │           │
  │       │      │                 │           └─ AdjustButtons [LolTimeFlash]
  │       │      │                 └─ SpellButton (slot2) [lol-cd-tracker SpellSlot]
  │       │      └─ SpellButton (slot1) [lol-cd-tracker SpellSlot]
  │       └─ 位置标签 [lol-cd-tracker EnemyCard]
  └─ 英雄头像 [league-spell-tracker ui-builder getChampionIconUrl]
     (API 不可用时显示位置首字母)

头像来源: Data Dragon CDN                          [league-spell-tracker]
头像加载失败时显示文字占位符                         [league-spell-tracker]
```

#### SpellButton（技能按钮）

**来源**: lol-cd-tracker `SpellSlot` + LoL_Summoner_Tracker 交互

```
三种状态:                                           [lol-cd-tracker SpellSlot]
├── idle:     亮色图标，显示 "--:--"
├── cooldown: 暗色图标 brightness(0.4)              [LoL_Summoner_Tracker]
│             显示倒计时 "3:42"
│             右侧显示回来时间 "→1525"
└── ready:    绿色边框脉冲动画
              显示 "✓"
              3 次闪烁后回到 idle

交互:
├── 左键: idle → 启动计时 + 复制                    [lol-cd-tracker SpellSlot]
│         cooldown → 重新开始计时 + 复制
├── 右键: 重置（任何状态 → idle）                    [LoL_Summoner_Tracker]
└── 图标: 技能图标来自 Data Dragon CDN              [league-spell-tracker]
```

---

## 八、数据流

### 8.1 自动检测流程

```
                    ┌──────────────────┐
                    │ League Client    │
                    │ 127.0.0.1:2999   │
                    └────────┬─────────┘
                             │ HTTPS (rejectUnauthorized: false)
                             │                              [league-spell-tracker]
                    ┌────────▼─────────┐
                    │ electron/main.ts │
                    │ IPC: playerlist  │
                    │ IPC: gamestats   │
                    └────────┬─────────┘
                             │ IPC invoke
                    ┌────────▼─────────┐
                    │ useGameDetect.ts │ 每 3 秒轮询
                    │                  │                    [league-spell-tracker]
                    └────────┬─────────┘
                             │ parseEnemies()
                    ┌────────▼─────────┐                    [league-spell-tracker]
                    │ gameData.ts      │
                    │ 识别队伍/过滤敌方 │
                    │ 解析技能/算急速   │
                    └────────┬─────────┘
                             │ updateEnemies()
                    ┌────────▼─────────┐
                    │ timerStore.ts    │                     [LolTimeFlash]
                    │ Zustand Store    │
                    │ 保存/恢复计时状态 │                     [league-spell-tracker]
                    └────────┬─────────┘
                             │ React re-render
              ┌──────────────▼──────────────┐
              │ TimerPanel → TimerRow ×5    │
              │ 显示英雄头像 + 技能 + 倒计时  │
              └─────────────────────────────┘
```

### 8.2 用户点击计时流程

```
用户点击 SpellButton
        │
        ▼
SpellButton.onClick()
        │
        ▼
timerStore.startTimer(pos, slot)
        │
        ├── electronAPI.getGameStats()               [PasteLikeDoinb]
        │         │
        │   ┌─────▼──────┐    ┌──────────────┐
        │   │ API 可用    │    │ API 不可用    │
        │   │ gameTime=625│    │ gameTime=null │
        │   └─────┬──────┘    └──────┬───────┘
        │         └──────┬───────────┘
        │                ▼
        ├── calcCooldown(baseCd, haste)              [lol-cd-tracker]
        │   → cd = baseCd × 100 / (100 + haste)
        │
        ├── cd -= REACTION_COMPENSATION (3s)         [LolTimeFlash]
        │
        ├── endsAt = Date.now() + cd × 1000          [LolTimeFlash]
        │
        ├── comebackGameTime = gameTime + cd          (如果 API 可用)
        │
        ▼
formatComebackTime(comebackGameTime)                  [PasteLikeDoinb]
        │
        ├── 925 秒 → 15分25秒 → "TOP 1525"
        ├── 1200 秒 → 20分00秒 → "TOP 2000"
        │
        ▼
electronAPI.copyToClipboard("TOP 1525")
        │
        ▼
Toast 显示 "Copied: TOP 1525"                         [新]
        │
        ▼
setInterval(1s) → SpellButton 更新倒计时显示
        │
        ▼
endsAt 到达 → 状态变为 ready → 绿色脉冲               [lol-cd-tracker]
```

### 8.3 快捷话术流程

```
用户点击 ChatButton "help dragon"
        │
        ▼
electronAPI.copyToClipboard("help dragon")
        │
        ▼
Toast 显示 "Copied: help dragon"
        │
        ▼
用户切回游戏 → Enter → Ctrl+V → Enter
```

---

## 九、UI 设计

### 9.1 配色方案

**来源**: lol-cd-tracker `index.css` 深色 LoL 主题

```
容器背景:       rgba(10, 15, 25, 0.92)      深蓝黑微透明
容器边框:       rgba(200, 170, 110, 0.3)     金色细边
标题栏:         rgba(5, 10, 20, 0.95)        更深
金色强调:       #c8aa6e                       LoL 标志金
普通文字:       #a09b8c                       柔和灰
倒计时文字:     #ff9944                       橙色（冷却中）
回来时间:       #7a9ec2                       浅蓝
就绪状态:       #2ecc71                       绿色
冷却中图标:     filter: brightness(0.4)       变暗     [LoL_Summoner_Tracker]
Flash 按钮底:   rgba(30, 58, 95, 0.6)        深蓝
Flash 激活底:   rgba(180, 70, 40, 0.5)       暗橙红
话术按钮:       rgba(44, 62, 80, 0.6)        深灰蓝
Toast:          rgba(200, 170, 100, 0.92)     金色
```

### 9.2 完整 UI 布局

```
┌───────────────────────────────────────────┐
│  ⚡ JiJiGuGu                  [📌] [×]   │  标题栏 [lol-cd-tracker TitleBar]
├───────────────────────────────────────────┤
│                                           │
│  [Ahri]  TOP  [⚡ 3:42 →1525][🔥 1:15]   │  自动识别头像 [league-spell-tracker]
│                                [-2][+2]   │  微调 [LolTimeFlash]
│  [Lee]   JG   [⚡ --:--     ][😈 0:12]   │
│                                           │
│  [Zed]   MID  [⚡ 1:15 →2000][🔥--:--]   │
│                                [-2][+2]   │
│  [Jinx]  ADC  [⚡ Ready ✓   ][💚--:--]   │  就绪脉冲 [lol-cd-tracker]
│                                           │
│  [Lulu]  SUP  [⚡ 4:58 →1830][😤--:--]   │
│                                [-2][+2]   │
├───────────────────────────────────────────┤
│  📋 Copy All                              │
│  "TOP 1525 MID 2000 SUP 1830"            │  预览文本
├───────────────────────────────────────────┤
│  Quick Chat                               │
│  [help dragon] [help baron] [ward pls]    │
│  [i farm alone] [on my way] [back]        │
│  [group mid]    [push]      [wait]        │
├───────────────────────────────────────────┤
│  Alt+T 切换 · 右键重置 · 延迟补偿 -3s     │  底部提示
└───────────────────────────────────────────┘

窗口大小: 300 × 520
位置: 默认右上角，可拖动
透明度: 92%
```

### 9.3 状态变化动画

```
idle → cooldown:
  按钮背景: 渐变为暗橙红 (transition 0.2s)          [lol-cd-tracker]
  技能图标: brightness(0.4)                          [LoL_Summoner_Tracker]
  显示倒计时文字 + 回来时间

cooldown → ready:
  按钮边框: 绿色脉冲动画 (3次)                       [lol-cd-tracker]
  显示 "✓"

ready → idle:
  3 秒后自动回到 idle 状态
```

---

## 十、复制格式规则

### 10.1 单个位置（点击技能按钮时复制）

```
有游戏时间（API 可用）:
  comebackSeconds = currentGameTime + adjustedCooldown
  925 秒 = 15 分 25 秒 → "TOP 1525"
  1200 秒 = 20 分 0 秒 → "TOP 2000"
  格式: "{POSITION} {MM}{SS:padStart(2,'0')}"

无游戏时间（API 不可用）:
  显示剩余倒计时 → "TOP 4:35"
  格式: "{POSITION} {M}:{SS:padStart(2,'0')}"
```

### 10.2 全部复制（Copy All 按钮）

```
拼接所有 active 状态中 spellName === 'Flash' 的槽位:
  "TOP 1525 MID 2000 SUP 1830"
  Flash 可能在 spell1 或 spell2（D 或 F 键），按 spellName 查找而非固定槽位
```

### 10.3 快捷话术

```
点击按钮直接复制预设文本:
  "help dragon"
  "help baron"
  "ward pls"
  "i farm alone"
  "on my way"
  "back"
  "group mid"
  "push"
  "wait"
```

---

## 十一、关键技术决策汇总

| # | 决策 | 选择 | 备选方案 | 理由 |
|---|------|------|---------|------|
| D1 | 状态管理 | Zustand | React Context (lol-cd-tracker) | 更轻量，无 Provider 嵌套，适合跨组件共享 5 位置状态 |
| D2 | 游戏时间 | League Live Client API (子端点) | allgamedata 单请求 | playerlist+gamestats 更轻量，PasteLikeDoinb 已验证 |
| D3 | 通信方式 | 剪贴板复制 | robotjs 自动打字 (PasteLikeDoinb) | 无需管理员权限，更安全，LoL 支持 Ctrl+V |
| D4 | 热键 | Alt+T | Tab / F-key | Tab 冲突记分板，Alt+T 不冲突且好记 |
| D5 | 窗口焦点 | focusable: false | focusable: true + blur() | league-spell-tracker 已验证，不抢游戏焦点 |
| D6 | 时间存储 | endsAt 时间戳 | 递减计数器 | LolTimeFlash 方案，无累计误差 |
| D7 | 更新频率 | 1 秒 / 次 | 100ms (LoL_Summoner_Tracker) | 召唤师技能以秒为单位，1 秒足够 |
| D8 | API 轮询 | 3 秒 / 次 | 2 秒 (league-spell-tracker) | 平衡实时性和性能 |
| D9 | 急速来源 | API 自动检测装备 | 手动切换 (lol-cd-tracker) | 更省事，league-spell-tracker 已实现 |
| D10 | 延迟补偿 | -3 秒（可配置） | 无 | LolTimeFlash 实战验证，提高精度 |
| D11 | 配置持久化 | electron-store | 手写 config.json | 自动处理路径/序列化/默认值，更可靠 |
| D12 | 位置分配 | 数组顺序 + Smite→JG 启发式 | 纯手动分配 | LolTimeFlash 验证方案，辅以手动调换兜底 |

---

## 十二、开发计划

### Phase 1: 项目搭建
- 从 lol-cd-tracker 复制骨架文件
- 安装依赖（electron, react, typescript, vite, zustand）
- 验证 `npm run dev` 能启动

### Phase 2: Electron 主进程
- 移植 league-spell-tracker 窗口配置
- 实现 IPC handlers（剪贴板、API 调用）
- 全局快捷键 Alt+T
- 系统托盘

### Phase 3: 核心计时功能
- 实现 timerStore (Zustand)
- 实现 SpellButton 组件（三态切换）
- 实现 TimerRow + TimerPanel
- 实现倒计时显示 + 自动复制

### Phase 4: API 集成
- 移植 league-spell-tracker 的 API 调用和敌方解析
- 实现 useGameDetect 自动检测
- 英雄头像 + 技能图标加载
- 装备急速自动计算

### Phase 5: 快捷话术 + 打磨
- ChatPanel + ChatButton
- CopyAllButton
- Toast 反馈
- AdjustButtons 微调
- 样式打磨

### Phase 6: 打包分发
- electron-builder 配置
- Windows exe 打包

---

## 十三、注意事项

1. **游戏模式**: overlay 在 LoL 无边框窗口模式下有效，全屏模式可能被覆盖
2. **API 可用性**: League Live Client API 仅在游戏对局中可用，排队/大厅时不可用
3. **SSL 证书**: API 使用自签名证书，需 `rejectUnauthorized: false`
4. **Riot 合规**: 仅读取公开 Live Client API + 手动剪贴板操作，不修改游戏内存、不自动发送按键。按当前设计尽量保持在第三方工具政策边界内，发布前仍需最终自查
5. **技能名解析**: API 返回的技能名格式不固定，需要 cleanSpellName 做规范化映射
6. **位置分配**: Live Client API 不返回分路信息，使用数组顺序 + Smite 启发式分配，可能不完全准确，支持手动调换
7. **对局切换**: 需检测 gameTime 回退或 roster 全变来识别新对局，避免上局计时残留
8. **安全模式**: 必须使用 contextIsolation:true + contextBridge，不可照搬 league-spell-tracker 的 nodeIntegration:true

---

## 十四、Review 修订记录

> 基于 Codex Review (2026-03-11) 核实后的修订

| # | 修订项 | 变更内容 | 来源 |
|---|--------|---------|------|
| R1 | CD 常量校正 | TP 360→300, Ghost/Exhaust/Cleanse 210→240, 3158 急速 12→10 | Data Dragon 16.5.1 核实 |
| R2 | 计时架构统一 | useTimer.ts 从"直接复用"改为"参考重写"，统一使用 endsAt + 全局 ticker | 源码核实: useTimer 是 setInterval 递减器 |
| R3 | API 端点优化 | allgamedata → playerlist + gamestats 子端点 | PasteLikeDoinb 已验证 |
| R4 | 位置分配策略 | ParsedEnemy 增加 position 字段，Smite→JG 启发式 + 手动调换 | LolTimeFlash riot-role-mapping 核实 |
| R5 | Copy All 修正 | "只包含 spell1" → 按 spellName 查找 Flash 槽位 | Flash 可在 D 或 F 键 |
| R6 | 新增 click-through | 锁定时 setIgnoreMouseEvents 穿透鼠标 | league-spell-tracker 源码核实 |
| R7 | 对局生命周期 | 新增新对局检测逻辑（gameTime 回退 / roster 全变 → 清空） | 新增 |
| R8 | 配置持久化 | 手写 config.json → electron-store | 新增 |
| R9 | 合规表述 | "符合政策" → "尽量保持在边界内，发布前需自查" | 措辞修正 |
| R10 | 安全模式警告 | 标注 league-spell-tracker 的 nodeIntegration:true 不可照搬 | 源码核实 |

**已评估但未采纳的建议:**
- ~~换 electron-vite~~: lol-cd-tracker 骨架已用 vite-plugin-electron，切换增加风险
- ~~openapi-typescript 生成类型~~: API 接口小且稳定，手写类型足够
- ~~功能收窄到 Flash-only~~: 当前设计已自然支持双槽，无需人为限制
- ~~Cosmic Insight 等符文急速~~: 留待 v1.1，v1 与现有 repo 保持一致只算装备急速
