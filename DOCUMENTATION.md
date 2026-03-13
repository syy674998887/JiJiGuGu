# JiJiGuGu Overlay — 项目文档

> **版本:** 1.0.0
> **平台:** Windows (Electron)
> **用途:** 英雄联盟召唤师技能计时器 + 快捷聊天覆盖层工具

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 项目结构](#2-项目结构)
- [3. 技术栈](#3-技术栈)
- [4. 核心功能详解](#4-核心功能详解)
  - [4.1 召唤师技能计时器](#41-召唤师技能计时器)
  - [4.2 敌方英雄自动检测](#42-敌方英雄自动检测)
  - [4.3 召唤师技能名称解析](#43-召唤师技能名称解析)
  - [4.4 位置分配算法](#44-位置分配算法)
  - [4.5 技能急速计算](#45-技能急速计算)
  - [4.6 符文急速检测 (Riot API)](#46-符文急速检测-riot-api)
  - [4.7 冷却时间计算公式](#47-冷却时间计算公式)
  - [4.8 复活时间 (Comeback Time)](#48-复活时间-comeback-time)
  - [4.9 自动剪贴板同步](#49-自动剪贴板同步)
  - [4.10 Ctrl+V 自动输入](#410-ctrlv-自动输入)
  - [4.11 Tab 按住显示覆盖层](#411-tab-按住显示覆盖层)
  - [4.12 屏幕锁定 (穿透点击)](#412-屏幕锁定-穿透点击)
  - [4.13 设置面板](#413-设置面板)
  - [4.14 窗口管理](#414-窗口管理)
  - [4.15 系统托盘](#415-系统托盘)
- [5. UI 组件架构](#5-ui-组件架构)
- [6. 状态管理 (Zustand Store)](#6-状态管理-zustand-store)
- [7. IPC 通信架构](#7-ipc-通信架构)
- [8. League Live Client Data API 详解](#8-league-live-client-data-api-详解)
  - [8.1 概述](#81-概述)
  - [8.2 /liveclientdata/playerlist](#82-liveclientdataplayerlist)
  - [8.3 /liveclientdata/gamestats](#83-liveclientdatagamestats)
  - [8.4 /liveclientdata/activeplayername](#84-liveclientdataactiveplayername)
  - [8.5 /liveclientdata/allgamedata](#85-liveclientdataallgamedata)
  - [8.6 SSL 证书处理](#86-ssl-证书处理)
  - [8.7 错误处理策略](#87-错误处理策略)
- [9. Riot Games API 详解](#9-riot-games-api-详解)
  - [9.1 Account API](#91-account-api)
  - [9.2 Spectator API](#92-spectator-api)
  - [9.3 符文检测逻辑](#93-符文检测逻辑)
- [10. Data Dragon CDN](#10-data-dragon-cdn)
- [11. Windows 原生集成](#11-windows-原生集成)
  - [11.1 SendInput 键盘模拟](#111-sendinput-键盘模拟)
  - [11.2 GetAsyncKeyState 按键检测](#112-getasynckeystate-按键检测)
- [12. 数据流架构](#12-数据流架构)
  - [12.1 初始化流程](#121-初始化流程)
  - [12.2 游戏检测流程](#122-游戏检测流程)
  - [12.3 计时器启动流程](#123-计时器启动流程)
  - [12.4 剪贴板自动同步流程](#124-剪贴板自动同步流程)
- [13. 配置常量](#13-配置常量)
- [14. 类型定义](#14-类型定义)
- [15. 未使用 / 休眠接口](#15-未使用--休眠接口)
- [16. 文件持久化说明](#16-文件持久化说明)
- [17. 构建与运行](#17-构建与运行)
- [18. 安全与合规](#18-安全与合规)

---

## 1. 项目概览

**JiJiGuGu Overlay** 是一个基于 Electron 的英雄联盟桌面覆盖层工具。它的核心能力是自动检测正在进行的对局中的敌方英雄及其召唤师技能，提供一键计时和剪贴板自动同步功能，让玩家可以快速在聊天中分享敌方闪现等技能的冷却信息。

### 核心设计理念

| 设计点 | 决策 | 理由 |
|--------|------|------|
| 数据来源 | League Live Client API (只读) | 官方提供、无侵入性 |
| 输入方式 | 剪贴板 + Windows SendInput | 无需管理员权限，通过 SendInput 模拟键盘输入绕过 LoL 独立剪贴板限制 |
| 时间存储 | 绝对时间戳 `endsAt = Date.now() + cd * 1000` | 避免 `setInterval` 递减方案的累积漂移问题 |
| 状态管理 | Zustand | 轻量级，无 Provider 嵌套，适合 5 位置 × 2 技能的状态模型 |
| 窗口行为 | `focusable: false` + `alwaysOnTop: screen-saver` | 不抢夺游戏焦点，始终显示在最顶层 |
| API 策略 | 3 个子端点并行请求 | 比 `allgamedata` 单端点节省 50-90% 流量 |

---

## 2. 项目结构

```
jjgg-overlay/
├── electron/                        # Electron 主进程代码
│   ├── main.ts                      # 主进程入口：窗口管理、IPC、API 代理、游戏内功能
│   ├── preload.ts                   # Context Bridge：安全暴露 IPC API 到渲染进程
│   ├── riotApi.ts                   # Riot Games API 集成：符文急速检测
│   └── sendInput.ts                 # Windows SendInput FFI：键盘模拟输入
│
├── src/                             # React 渲染进程代码
│   ├── main.tsx                     # React 入口：挂载 App 到 DOM
│   ├── App.tsx                      # 根组件：组合所有 hooks 和子组件
│   │
│   ├── components/                  # UI 组件
│   │   ├── TitleBar.tsx             # 标题栏：Logo、锁定按钮、设置、最小化
│   │   ├── TimerPanel.tsx           # 计时面板：渲染 5 行 TimerRow
│   │   ├── TimerRow.tsx             # 单行计时：英雄头像 + 位置标签 + 2 个技能按钮
│   │   ├── SpellButton.tsx          # 技能按钮：点击启动/缩短计时、右键重置、倒计时显示
│   │   ├── AdjustButtons.tsx        # 调整按钮：±2 秒微调
│   │   ├── CopyAllButton.tsx        # 调试预览：显示当前剪贴板文本
│   │   └── SettingsPanel.tsx        # 设置面板：反应延迟、调试开关
│   │
│   ├── hooks/                       # 自定义 React Hooks
│   │   ├── useGameDetect.ts         # 游戏检测：轮询 API、解析敌方、管理游戏状态
│   │   ├── useAutoClipboard.ts      # 自动剪贴板：每秒同步活跃闪现计时到剪贴板
│   │   ├── useScreenLock.ts         # 屏幕锁定：同步主进程/渲染进程锁定状态
│   │   └── useTickingTimer.ts       # 全局秒级 Ticker：共享 setInterval，驱动 UI 更新
│   │
│   ├── services/                    # 数据处理服务
│   │   └── gameData.ts              # 游戏数据解析：cleanSpellName、parseEnemies、位置分配
│   │
│   ├── store/                       # Zustand 状态管理
│   │   └── timerStore.ts            # Timer Store：敌方状态、计时器 CRUD、急速重算
│   │
│   ├── utils/                       # 工具函数
│   │   ├── spells.ts                # 冷却计算：calcCooldown、formatTime
│   │   ├── format.ts                # 剪贴板格式化：formatAllTimers、formatComebackTime
│   │   └── icons.ts                 # 图标 URL：DDragon CDN 路径生成
│   │
│   ├── types/                       # TypeScript 类型定义
│   │   ├── index.ts                 # 所有接口和类型：Position、SpellTimer、PlayerData 等
│   │   └── electron.d.ts            # 渲染进程 electronAPI 类型声明 (Window 全局扩展)
│   │
│   ├── constants/                   # 配置常量
│   │   └── config.ts                # 冷却时间表、装备急速表、API 轮询间隔
│   │
│   └── styles/                      # 样式
│       └── index.css                # 全局 CSS：LoL 暗色主题
│
├── build/                           # 静态资源
│   ├── logo.ico                     # Windows 图标
│   └── logo.png                     # 托盘图标
│
├── public/                          # Vite 公共资源
│   └── logo.png                     # 应用 Logo
│
├── .env                             # Riot API Key（不提交 Git）
├── package.json                     # 依赖与构建配置
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite + Electron 插件配置
└── index.html                       # HTML 入口
```

---

## 3. 技术栈

### 运行时依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `react` | ^18.2.0 | UI 框架 |
| `react-dom` | ^18.2.0 | DOM 渲染 |
| `zustand` | ^5.0.0 | 轻量状态管理 |
| `electron-store` | ^8.1.0 | 持久化配置存储 (基于 JSON 文件) |
| `koffi` | ^2.9.0 | 纯 JS FFI，调用 Windows user32.dll |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `electron` | ^28.1.0 | 桌面应用框架 |
| `electron-builder` | ^24.9.1 | 打包为 Windows .exe 安装程序 |
| `vite` | ^5.0.8 | 前端构建工具 + HMR |
| `vite-plugin-electron` | ^0.28.4 | Vite + Electron 主进程集成 |
| `vite-plugin-electron-renderer` | ^0.14.5 | 渲染进程 HMR 支持 |
| `typescript` | ^5.2.2 | 类型安全 |
| `@vitejs/plugin-react` | ^4.2.1 | React JSX/TSX 转译 |

---

## 4. 核心功能详解

### 4.1 召唤师技能计时器

**功能描述：** 追踪 5 个敌方位置 (上单/打野/中单/ADC/辅助) 的 2 个召唤师技能冷却时间。

**实现文件：** `src/components/SpellButton.tsx`, `src/store/timerStore.ts`

**工作流程：**

1. **启动计时** — 玩家左键点击处于就绪状态的技能按钮
2. **获取游戏时间** — 即时调用 `getGameStats()` 获取当前 `gameTime`
3. **计算冷却** — `baseCd → 急速减免 → 反应延迟减免 → actualCd`
4. **存储时间戳** — `endsAt = Date.now() + actualCd * 1000`（绝对时间戳）
5. **计算复活时间** — `comebackGameTime = gameTime + actualCd`（游戏内时间）
6. **UI 更新** — 每秒通过 `useTickingTimer` 重新渲染，显示剩余 `M:SS`
7. **冷却中再次点击** — 如果计时器正在倒计时，再次左键点击会减去 `reactionDelay` 秒（用于修正启动延迟）
8. **计时完成** — `remaining <= 0` 时显示绿色对勾 ✓，边框脉冲动画 3 次
9. **右键重置** — 右键点击将计时器重置为空闲状态

**两种视觉状态 (CSS 类)：**

代码中只有两个 CSS 状态类：`spell-cooldown` 和 `spell-ready`。空闲状态和冷却完成后的就绪状态共享同一个 `spell-ready` 类。

| 状态 | CSS 类 | 条件 | 图标 | 文本 | 边框 | 背景 |
|------|--------|------|------|------|------|------|
| 就绪/空闲 | `spell-ready` | `!active` 或 `remaining <= 0` | 正常亮度 | 绿色 ✓ | 绿色 + 脉冲动画 (3 次) | 默认蓝色 |
| 冷却中 | `spell-cooldown` | `active && remaining > 0` | `brightness(0.4)` 变暗 | 橙色倒计时 `M:SS` | 橙红色 | 橙红色半透明 |

> **注意：** `spell-ready` 的绿色脉冲动画 (`readyPulse`) 在首次赋予该类时播放 3 次，之后静止。因此从冷却结束过渡到就绪时会有视觉反馈，而一直处于空闲的按钮不会持续动画。

**时间存储采用绝对时间戳的优势：**
```
// ❌ 不好的方案：递减计时
let remaining = 300
setInterval(() => remaining--, 1000)  // 存在累积漂移

// ✅ 本项目方案：绝对时间戳
const endsAt = Date.now() + 300 * 1000
// 每次渲染时计算：remaining = (endsAt - Date.now()) / 1000
```

---

### 4.2 敌方英雄自动检测

**功能描述：** 自动从 League Live Client API 检测正在对局中的敌方英雄、他们的召唤师技能和装备。

**实现文件：** `src/hooks/useGameDetect.ts`

**轮询机制：**

```
每 3 秒 (API_POLL_INTERVAL = 3000ms):
├── 并行请求 3 个子端点
│   ├── GET /liveclientdata/playerlist     → 玩家列表
│   ├── GET /liveclientdata/gamestats      → 游戏统计 (含 gameTime)
│   └── GET /liveclientdata/activeplayername → 当前玩家名
│
├── 成功：
│   ├── 检测 gameTime 回退 → 新游戏，清除所有计时器
│   ├── 检测阵容变化 → 新游戏，清除所有计时器
│   ├── parseEnemies() → 解析敌方数据
│   ├── 首次检测 → 通过 Riot API 获取符文急速
│   └── updateEnemies() → 更新 store 中的敌方状态
│
└── 失败：
    ├── failCount++
    └── 连续失败 5 次 → 标记为不在游戏中，清除所有数据
```

**新游戏检测逻辑：**

```typescript
// 情况1：gameTime 大幅回退（>30秒）= 新游戏
if (prevGameTimeRef.current !== null && gameTime < prevGameTimeRef.current - 30) {
    clearAllTimers()
}

// 情况2：敌方英雄名单变化 = 新游戏
const rosterKey = parsed.map(e => e.championName).sort().join(',')
if (prevRosterRef.current !== '' && rosterKey !== prevRosterRef.current) {
    clearAllTimers()
}
```

**为什么用 3 个子端点而不是 `allgamedata`：**
- `playerlist` + `gamestats` + `activeplayername` 总计约 15-20KB
- `allgamedata` 单次请求 30-200KB（包含大量无用的能力描述文本）
- 每 3 秒轮询一次，节省 50-90% 网络流量

---

### 4.3 召唤师技能名称解析

**功能描述：** 将 API 返回的各种格式的技能名称标准化为内部枚举值。

**实现文件：** `src/services/gameData.ts` → `cleanSpellName()`

**挑战：** League Live Client Data API 返回的技能名称格式多样且不一致：
- 英文完整：`"GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"`
- 英文简称：`"SummonerFlash"`
- 英文显示名：`"Flash"`
- 中文：`"闪现"`
- 其他语言本地化名称

**解决方案：关键词匹配 (includes)**

```typescript
function cleanSpellName(displayName: string, rawDisplayName?: string): SpellName {
    // 合并两个字段进行匹配
    const raw = ((rawDisplayName || '') + ' ' + (displayName || '')).toLowerCase()

    // 按优先级匹配关键词（特殊名称优先检查）
    if (raw.includes('flash') || raw.includes('闪现')) return 'Flash'
    if (raw.includes('teleport') || raw.includes('传送')) return 'Teleport'
    if (raw.includes('ignite') || raw.includes('dot') || raw.includes('引燃')) return 'Ignite'
    if (raw.includes('heal') || raw.includes('治疗')) return 'Heal'
    if (raw.includes('exhaust') || raw.includes('虚弱')) return 'Exhaust'
    if (raw.includes('barrier') || raw.includes('屏障')) return 'Barrier'
    if (raw.includes('cleanse') || raw.includes('boost') || raw.includes('净化')) return 'Cleanse'
    if (raw.includes('ghost') || raw.includes('haste') || raw.includes('疾跑')) return 'Ghost'
    if (raw.includes('smite') || raw.includes('惩戒') || raw.includes('重击')) return 'Smite'
    if (raw.includes('clarity') || raw.includes('mana') || raw.includes('清晰')) return 'Clarity'

    // 最后手段：从 rawDisplayName 中提取 "SummonerXxx" 格式
    // ...
    return 'Flash' // 兜底默认值
}
```

**关键词映射表：**

| 技能 | 英文关键词 | API 内部名 | 中文关键词 |
|------|-----------|-----------|-----------|
| Flash | `flash` | `SummonerFlash` | `闪现` |
| Teleport | `teleport` | `SummonerTeleport` | `传送` |
| Ignite | `ignite`, `dot` | `SummonerDot` | `引燃`, `点燃` |
| Heal | `heal` | `SummonerHeal` | `治疗` |
| Exhaust | `exhaust` | `SummonerExhaust` | `虚弱` |
| Barrier | `barrier` | `SummonerBarrier` | `屏障` |
| Cleanse | `cleanse`, `boost` | `SummonerBoost` | `净化` |
| Ghost | `ghost`, `haste` | `SummonerHaste` | `疾跑` |
| Smite | `smite` | `SummonerSmite` | `惩戒`, `重击` |
| Clarity | `clarity`, `mana` | `SummonerMana` | `清晰` |

---

### 4.4 位置分配算法

**功能描述：** 将检测到的 5 个敌方英雄分配到 TOP/JG/MID/ADC/SUP 五个位置。

**实现文件：** `src/services/gameData.ts` → `parseEnemies()`

**算法逻辑：**

```
1. 从 playerList 中找到当前玩家 → 确定"我方队伍"
2. 过滤出敌方队伍 (team !== myTeam)
3. 遍历敌方：
   ├── 如果有惩戒 (Smite) → 分配到 JG 位置（仅分配第一个有惩戒的）
   └── 其余按数组顺序 → TOP, MID, ADC, SUP
4. 如果没有任何人带惩戒 → 最后一个人分配到 JG
5. 按位置顺序排序：TOP(0) → JG(1) → MID(2) → ADC(3) → SUP(4)
```

**为什么用惩戒识别打野：** Riot API 不提供位置信息，但惩戒是打野的必带技能，准确率接近 100%。

**限制：** 其余 4 个位置按 API 返回顺序分配，可能与实际位置不完全匹配。但对于计时器功能而言，位置仅是标识用途，不影响核心功能。

---

### 4.5 技能急速计算

**功能描述：** 从敌方装备中计算召唤师技能急速值，影响冷却时间。

**实现文件：** `src/services/gameData.ts` → `calcItemHaste()`, `src/constants/config.ts`

**影响召唤师技能急速的装备：**

| 装备 ID | 名称 | 急速值 |
|---------|------|--------|
| `3158` | 明朗之靴 (Ionian Boots of Lucidity) | +10 |
| `3171` | 绯红明朗 (Crimson Lucidity, 升级版) | +20 |

**计算方式：**
```typescript
function calcItemHaste(items: Array<{ itemID: number }>): number {
    let haste = 0
    for (const item of items) {
        if (ITEM_HASTE[item.itemID]) {
            haste += ITEM_HASTE[item.itemID]
        }
    }
    return haste
}

// 总急速 = 装备急速 + 符文急速
const totalHaste = itemHaste + runeHaste
```

**动态重算：** 当检测到敌方装备变化（如购买明朗之靴）时，正在进行的计时器会按比例调整：

```typescript
function recalcTimerForHaste(spell, oldHaste, newHaste, currentGameTime, reactionDelay) {
    if (!spell.active || spell.endsAt <= Date.now()) return spell

    // 计算旧/新冷却（使用 spell.baseCooldown 而非外部变量）
    const oldCd = Math.max(1, calcCooldown(spell.baseCooldown, oldHaste) - reactionDelay)
    const newCd = Math.max(1, calcCooldown(spell.baseCooldown, newHaste) - reactionDelay)

    // 按已过去的比例映射到新冷却
    const now = Date.now()
    const remainingMs = spell.endsAt - now
    const totalMs = oldCd * 1000
    const pctRemaining = totalMs > 0 ? remainingMs / totalMs : 0

    const newRemainingMs = pctRemaining * newCd * 1000
    const newEndsAt = now + newRemainingMs

    // 同时更新 comebackGameTime
    let newComebackGameTime = null
    if (currentGameTime !== null) {
        newComebackGameTime = Math.floor(currentGameTime + newRemainingMs / 1000)
    }

    return { ...spell, actualCooldown: newCd, endsAt: newEndsAt, comebackGameTime: newComebackGameTime }
}
```

---

### 4.6 符文急速检测 (Riot API)

**功能描述：** 通过 Riot Games 官方 API 检测敌方是否携带"星界洞悉"符文（+18 召唤师技能急速）。

**实现文件：** `electron/riotApi.ts`

**工作流程：**

```
1. 从 Live Client API 获取当前玩家名
2. 在 playerList 中找到当前玩家的 riotId
3. 调用 Account API 将 riotId 转换为 PUUID
4. 调用 Spectator API 获取对局数据（包含所有玩家的符文）
5. 找到己方队伍 teamId
6. 遍历敌方参与者：
   └── 检查 perks.perkIds 是否包含 8347 (Cosmic Insight)
   └── 如果包含 → 该敌方 runeHaste = 18
7. 返回 Record<riotId, runeHaste>
```

**调用频率：** 每局游戏仅调用一次（`runeHasteFetchedRef` 标记）。原因：
- 符文在游戏开始后不会改变
- Riot API 有速率限制
- 减少不必要的外部请求

**降级与前置条件：**
- 如果 `.env` 中未配置 `RIOT_API_KEY`（`apiKey` 为空字符串），`riotGet()` 直接返回 `null`，跳过所有 Riot API 调用
- 如果当前玩家的 `riotId` 解析失败（无法拆分 `gameName#tagLine`），直接返回空结果
- 如果 PUUID 获取失败或 Spectator 数据不可用，返回空 `Record`，计时器仍可正常工作（仅缺少符文急速，使用 0 作为默认值）
- 离开游戏时 (`isInGame → false`) 重置 `runeHasteRef` 和 `runeHasteFetchedRef`，确保下一局重新获取

---

### 4.7 冷却时间计算公式

**实现文件：** `src/utils/spells.ts`

```typescript
/**
 * 急速减免公式：cd = floor(baseCd × 100 / (100 + haste))
 *
 * 示例：Flash (300s) + 28 急速 (明朗之靴 10 + 星界洞悉 18)
 *       = floor(300 × 100 / 128) = floor(234.375) = 234 秒 (3:54)
 */
function calcCooldown(baseCooldown: number, haste: number): number {
    if (haste <= 0) return baseCooldown
    return Math.floor((baseCooldown * 100) / (100 + haste))
}
```

**完整冷却计算链：**

```
baseCd (基础冷却, 从 SPELL_COOLDOWNS 查表)
  → afterHaste = floor(baseCd × 100 / (100 + totalHaste))
    → actualCd = max(0, afterHaste - reactionDelay)
      → endsAt = Date.now() + actualCd × 1000
```

---

### 4.8 复活时间 (Comeback Time)

**功能描述：** 将冷却完成时间转换为游戏内时钟格式（如 "15:25"），便于与队友沟通。

**实现文件：** `src/utils/format.ts`

```typescript
// 启动计时时：
const comebackGameTime = Math.floor(gameTime) + actualCd
// 例：当前游戏时间 10:25 (625秒)，闪现 CD 234秒
// → comebackGameTime = 625 + 234 = 859秒 = 14:19

// 格式化为 "MM:SS"：
function formatComebackTime(gameTimeSeconds: number): string {
    const minutes = Math.floor(gameTimeSeconds / 60)
    const seconds = Math.floor(gameTimeSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
// 859 → "14:19"
```

**降级策略：** 如果 League Live Client Data API 的 `gameTime` 不可用（`comebackGameTime === null`），则显示剩余倒计时时间代替。

---

### 4.9 自动剪贴板同步

**功能描述：** 每秒自动将所有活跃的闪现计时器格式化并写入系统剪贴板。

**实现文件：** `src/hooks/useAutoClipboard.ts`, `src/utils/format.ts`

**同步逻辑：**

```typescript
function useAutoClipboard() {
    useTickingTimer()  // 每秒触发一次

    useEffect(() => {
        const text = formatAllTimers(enemies)

        // 仅在文本变化时写入剪贴板（避免不必要的系统调用）
        if (text !== prevTextRef.current) {
            prevTextRef.current = text
            window.electronAPI.copyToClipboard(text)
        }
    })
}
```

**格式化规则：**
- 仅包含**闪现 (Flash)** 的活跃计时器
- 优先使用 comebackGameTime（游戏内时间格式）
- 降级使用 remaining（剩余倒计时格式）
- 多个计时器用空格分隔
- 位置缩写：Top, Jng, Mid, Bot, Sup

**输出示例：**
```
"15:25Top"                      ← 单个：上单闪现在游戏 15:25 恢复
"15:25Top 20:00Mid 18:30Sup"    ← 多个
"4:35Top"                       ← 降级：gameTime 不可用时显示剩余时间
""                              ← 无活跃闪现计时器
```

---

### 4.10 Ctrl+V 自动输入

**功能描述：** 在游戏中按 Ctrl+V 时，自动将剪贴板内容通过 SendInput "打字"到游戏中。

**实现文件：** `electron/main.ts` → `enableInGameFeatures()`, `electron/sendInput.ts`

**为什么需要这个功能：**
英雄联盟的游戏聊天不支持标准的 Ctrl+V 粘贴操作（游戏有自己独立的剪贴板）。本功能通过 Windows SendInput API 模拟键盘按键来"打字"输入文本。

**实现细节：**

```
Ctrl+V 轮询 (每 50ms):
├── GetAsyncKeyState(VK_CONTROL) → Ctrl 是否按下
├── GetAsyncKeyState(VK_V) → V 是否按下（带边沿检测，防重复触发）
└── 两者同时按下 + V 是新按下的（非持续按住）:
    ├── clipboard.readText() → 读取剪贴板
    └── sendInputText(text) → 通过 SendInput 输入
```

**sendInputText 实现：**

```typescript
function sendInputText(text: string): number {
    // 1. 将文本转为 UTF-16LE 编码
    const utf16 = Buffer.from(text, 'utf16le')

    // 2. 构建 INPUT 结构体数组（每个字符需要 keydown + keyup = 2 个事件）
    //    额外 +1 个事件：先释放 Ctrl 键（防止字符被解读为 Ctrl+字符）
    const inputCount = 1 + codeUnits * 2
    const buf = Buffer.alloc(inputCount * INPUT_SIZE)  // INPUT_SIZE = 40 bytes (x64)

    // 3. 首先释放 Ctrl 键
    writeVirtualKeyInput(buf, 0, VK_CONTROL, /* keyUp */ true)

    // 4. 为每个字符写入 KEYEVENTF_UNICODE down + up
    for (let i = 0; i < codeUnits; i++) {
        const code = utf16.readUInt16LE(i * 2)
        const baseOffset = (1 + i * 2) * INPUT_SIZE
        writeUnicodeInput(buf, baseOffset, code, false)                // key down
        writeUnicodeInput(buf, baseOffset + INPUT_SIZE, code, true)    // key up
    }

    // 5. 一次 SendInput 调用发送所有事件
    return SendInput(inputCount, buf, INPUT_SIZE)
}
```

**关键技术点：**
- 使用 `KEYEVENTF_UNICODE` 标志，直接发送 UTF-16 字符码，无需处理键盘布局映射
- 必须先释放 Ctrl 键，否则字符会被解读为 Ctrl+字符快捷键
- 所有 INPUT 结构体打包为单个 Buffer，一次 `SendInput` 调用发送，保证原子性
- 使用 `koffi` 库实现 FFI，无需 native addon 编译

---

### 4.11 Tab 按住显示覆盖层

**功能描述：** 游戏中默认隐藏覆盖层，按住 Tab 键时显示（与游戏记分板同步）。

**实现文件：** `electron/main.ts` → `enableInGameFeatures()`

```typescript
// Tab 检测轮询（每 50ms）
tabPollTimer = setInterval(() => {
    const tabDown = isTabDown()  // GetAsyncKeyState(VK_TAB)
    if (tabDown && !tabWasDown) {
        mainWindow.setOpacity(1)   // Tab 按下 → 显示
    } else if (!tabDown && tabWasDown) {
        mainWindow.setOpacity(0)   // Tab 释放 → 隐藏
    }
    tabWasDown = tabDown
}, 50)
```

**为什么用 opacity 而不是 show/hide：**
`window.hide()` / `window.show()` 会触发 Windows DWM 动画，导致可见的闪烁。使用 `setOpacity(0/1)` 是即时的，没有过渡动画。

**为什么用 50ms 轮询而不是全局快捷键：**
- Electron 的 `globalShortcut` 不支持"按住检测"，只能注册按下/释放
- Tab 键在游戏中有特殊用途（记分板），注册全局快捷键可能干扰
- 50ms 轮询延迟在人类感知阈值以内

---

### 4.12 屏幕锁定 (穿透点击)

**功能描述：** 锁定后鼠标事件穿透覆盖层到下方的游戏窗口，悬停时临时恢复交互。

**实现文件：** `src/App.tsx`, `src/hooks/useScreenLock.ts`, `electron/main.ts`

**工作原理：**

```
锁定状态 (isLocked = true):
├── setIgnoreMouseEvents(true, { forward: true })
│   └── 鼠标事件穿透到游戏，但仍触发 mouseenter/mouseleave
├── 鼠标进入 overlay 区域 (mouseenter):
│   └── setIgnoreMouseEvents(false) → 临时恢复交互
├── 鼠标离开 overlay 区域 (mouseleave):
│   └── setIgnoreMouseEvents(true, { forward: true }) → 恢复穿透
└── 标题栏禁止拖拽：.title-bar-drag.no-drag { -webkit-app-region: no-drag }

解锁状态 (isLocked = false):
├── setIgnoreMouseEvents(false)
└── 标题栏可拖拽：.title-bar-drag { -webkit-app-region: drag }
```

**触发方式：**
- UI 按钮：标题栏的锁定图标
- 快捷键：`Ctrl+Shift+L`（全局热键）

**状态持久化：** `electron-store` 保存 `screenLocked` 状态，重启后恢复。

---

### 4.13 设置面板

**功能描述：** 可调节的运行时参数。

**实现文件：** `src/components/SettingsPanel.tsx`

| 设置项 | 类型 | 范围 | 默认值 | 说明 |
|--------|------|------|--------|------|
| Reaction Delay | number | 0-10 秒 | 0 | 从计算的 CD 中减去，补偿人类反应时间延迟 |
| Debug | boolean | ON/OFF | OFF | 显示剪贴板预览文本 |

**反应延迟的意义：**
当你看到敌人使用闪现时，通常已经过去了几秒才点击计时按钮。设置 `reactionDelay = 2` 意味着每次启动计时都自动减去 2 秒，更贴近实际冷却完成时间。

---

### 4.14 窗口管理

**实现文件：** `electron/main.ts`

**窗口属性：**

```typescript
new BrowserWindow({
    width: 500, height: 100,
    transparent: true,          // 背景透明
    frame: false,               // 无系统边框
    resizable: false,           // 不可手动调整大小
    alwaysOnTop: true,          // 始终置顶
    focusable: false,           // 不抢夺焦点
    skipTaskbar: true,          // 不显示在任务栏
    webPreferences: {
        contextIsolation: true, // 安全隔离
        nodeIntegration: false, // 禁用 Node
    },
})

mainWindow.setAlwaysOnTop(true, 'screen-saver')        // 最高置顶级别
mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true    // 全屏游戏中也可见
})
```

**窗口大小自动适配：**
```typescript
// App.tsx 中通过 ResizeObserver 监听内容尺寸变化
const observer = new ResizeObserver(() => {
    const zoom = 1.25  // CSS zoom 因子
    const width = Math.ceil(el.offsetWidth * zoom)
    const height = Math.ceil(el.offsetHeight * zoom)
    window.electronAPI.setWindowSize(width, height)
})
```

**位置持久化：**
```typescript
// 窗口移动时防抖保存（300ms）
mainWindow.on('moved', () => {
    clearTimeout(moveTimeout)
    moveTimeout = setTimeout(() => {
        const [x, y] = mainWindow.getPosition()
        store.set('windowX', x)
        store.set('windowY', y)
    }, 300)
})
```

**置顶保持：** 每 5 秒重新设置 `setAlwaysOnTop(true, 'screen-saver')`，防止全屏游戏覆盖。

**单实例锁定：**
```typescript
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()  // 已有实例在运行，退出

app.on('second-instance', () => {
    if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()
    }
})
```

---

### 4.15 系统托盘

**实现文件：** `electron/main.ts` → `createTray()`

**功能：**
- 托盘图标：`build/logo.png` (16×16)
- 右键菜单：Show/Hide、Quit
- 双击：切换窗口显示/隐藏
- 最小化按钮实际是 `window.hide()`（隐藏到托盘）

---

## 5. UI 组件架构

```
App.tsx ────────────────────────────────────────────────────────
│  Hooks: useGameDetect(), useAutoClipboard(), useScreenLock()
│  Logic: 鼠标穿透管理、ResizeObserver 自动调整窗口大小
│
├── TitleBar.tsx ───────────────────────────────────────────────
│   │  Props: onSettingsToggle, settingsOpen
│   │  Hook: useScreenLock()
│   │
│   ├── Logo + "JiJiGuGu" 标题 (可拖拽区域)
│   ├── Settings 按钮 (齿轮图标)
│   ├── Lock 按钮 (图钉图标, 高亮=已锁定)
│   └── Minimize 按钮 (→ 隐藏到托盘)
│
├── [if !isInGame] → "Waiting for League of Legends..." 状态栏
│
├── [if isInGame] → TimerPanel.tsx ─────────────────────────────
│   │  Data: enemies from timerStore
│   │
│   ├── TimerRow.tsx (position="TOP") ──────────────────────────
│   │   ├── Champion Avatar (28×28 圆形, DDragon CDN)
│   │   ├── Position Label ("Top")
│   │   ├── SpellButton.tsx (slot="spell1") ────────────────────
│   │   │   │  Hooks: useTickingTimer(), useTimerStore()
│   │   │   ├── Spell Icon (20×20, DDragon CDN)
│   │   │   ├── [if cooldown] → "M:SS" 橙色倒计时
│   │   │   └── [if ready] → ✓ 绿色对勾
│   │   │
│   │   └── SpellButton.tsx (slot="spell2") ────────────────────
│   │       └── (同上)
│   │
│   ├── TimerRow.tsx (position="JG")
│   ├── TimerRow.tsx (position="MID")
│   ├── TimerRow.tsx (position="ADC")
│   └── TimerRow.tsx (position="SUP")
│
├── [if isInGame] → CopyAllButton.tsx ──────────────────────────
│   │  [仅 debug=true 时显示]
│   └── 剪贴板预览文本 (蓝色, 10px)
│
└── [if settingsOpen] → SettingsPanel.tsx ──────────────────────
    ├── Reaction delay 输入框 (0-10秒)
    ├── Debug 开关
    └── 快捷键参考
```

---

## 6. 状态管理 (Zustand Store)

**文件：** `src/store/timerStore.ts`

### Store 结构

```typescript
interface TimerStore {
    // ===== 状态 =====
    enemies: Record<Position, EnemyState>  // 5个位置的敌方状态
    isInGame: boolean                       // 是否在游戏中
    gameTime: number | null                 // 当前游戏时间(秒)
    reactionDelay: number                   // 反应延迟补偿(秒)
    debug: boolean                          // 调试模式开关

    // ===== 操作 =====
    startTimer(pos, slot): Promise<void>    // 启动计时器
    resetTimer(pos, slot): void             // 重置计时器
    adjustTimer(pos, slot, seconds): void   // 调整计时器 ±N 秒
    updateEnemies(data): void               // 更新敌方数据(来自 API)
    setGameState(inGame, gameTime): void    // 设置游戏状态
    swapPositions(posA, posB): void         // 交换两个位置
    clearAllTimers(): void                  // 重置全部敌方状态和计时器到默认值
    setReactionDelay(seconds): void         // 设置反应延迟
    setDebug(on): void                      // 设置调试模式
}
```

### EnemyState 结构

```typescript
interface EnemyState {
    championName: string        // 英雄英文名 (DDragon 格式, 如 "Ahri")
    championIconUrl: string     // 头像 URL
    haste: number               // 总召唤师技能急速 (装备 + 符文)
    spell1: SpellTimer          // 技能栏位1
    spell2: SpellTimer          // 技能栏位2
}

interface SpellTimer {
    active: boolean             // 是否正在计时
    spellName: SpellName        // 技能名称枚举
    baseCooldown: number        // 基础冷却时间(秒)
    actualCooldown: number      // 实际冷却时间(经急速+反应延迟计算后)
    endsAt: number              // 冷却结束的 Date.now() 时间戳
    comebackGameTime: number | null  // 冷却结束的游戏内时间(秒), null=API不可用
}
```

### 关键操作详解

**`updateEnemies(parsedEnemies)`** — 从 API 数据更新敌方状态：

```
对每个 parsedEnemy:
├── 如果位置上的英雄没变 (championName 相同):
│   ├── 保留已有计时器状态 (不中断进行中的计时)
│   ├── 更新技能名称和基础冷却
│   └── 如果急速变化 → recalcTimerForHaste() 按比例调整
│
└── 如果英雄变了:
    └── 创建全新的默认计时器
```

---

## 7. IPC 通信架构

### 渲染进程 → 主进程 (electronAPI)

通过 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露：

| 方法 | IPC 类型 | 主进程 Handler | 用途 |
|------|---------|---------------|------|
| `copyToClipboard(text)` | `invoke` | `clipboard.writeText(text)` | 写入系统剪贴板 |
| `getPlayerList()` | `invoke` | `fetchLeagueAPI('/liveclientdata/playerlist')` | 获取玩家列表 |
| `getGameStats()` | `invoke` | `fetchLeagueAPI('/liveclientdata/gamestats')` | 获取游戏统计 |
| `getActivePlayer()` | `invoke` | `fetchLeagueAPI('/liveclientdata/activeplayername')` | 获取当前玩家名 |
| `getAllGameData()` | `invoke` | `fetchLeagueAPI('/liveclientdata/allgamedata')` | 获取完整游戏数据 |
| `getEnemyRuneHaste(name, players)` | `invoke` | `fetchEnemyRuneHaste(...)` | 获取敌方符文急速 |
| `getScreenLock()` | `invoke` | 返回 `isScreenLocked` | 查询锁定状态 |
| `savePosition(pos)` | `send` | `store.set('windowX/Y', ...)` | 保存窗口位置 |
| `toggleScreenLock()` | `send` | 切换锁定状态 | 触发锁定切换 |
| `setWindowSize(w, h)` | `send` | `mainWindow.setSize(w, h)` | 设置窗口大小 |
| `setIgnoreMouseEvents(ignore)` | `send` | `mainWindow.setIgnoreMouseEvents(...)` | 切换鼠标穿透 |
| `setInGame(inGame)` | `send` | 启用/禁用游戏内功能 | 通知游戏状态 |
| `closeApp()` | `send` | `app.quit()` | 退出应用 |
| `minimizeApp()` | `send` | `mainWindow.hide()` | 隐藏到托盘 |

> **类型声明缺失：** `getEnemyRuneHaste` 在 `preload.ts` 中已暴露，在 `main.ts` 中已注册 handler，但 `src/types/electron.d.ts` 的 `ElectronAPI` 接口中**未声明此方法**。因此 `useGameDetect.ts` 中使用了 `(window.electronAPI as any).getEnemyRuneHaste(...)` 强制类型转换绕过。

### 主进程 → 渲染进程

| 事件 | 触发条件 | 数据 |
|------|---------|------|
| `screen-lock-changed` | 锁定状态改变 | `boolean` |

---

## 8. League Live Client Data API 详解

### 8.1 概述

**League of Legends Live Client Data API** 是 Riot Games 官方提供的本地 HTTP API，运行于游戏客户端进程中。

| 属性 | 值 |
|------|-----|
| 基础 URL | `https://127.0.0.1:2999` |
| 协议 | HTTPS (自签名证书) |
| 可用时机 | 仅在游戏加载后至游戏结束期间 |
| 访问权限 | 只读，无需认证 |
| 数据范围 | 当前对局的玩家、装备、技能、游戏时间等 |

**请求配置：**
```typescript
https.get(`https://127.0.0.1:2999${endpoint}`, {
    rejectUnauthorized: false,  // 忽略自签名证书
    timeout: 2000,              // 2秒超时
})
```

---

### 8.2 /liveclientdata/playerlist

**用途：** 获取当前对局中所有 10 名玩家的详细信息。

**请求：**
```
GET https://127.0.0.1:2999/liveclientdata/playerlist
```

**响应：** `PlayerData[]` — 10 个玩家对象的数组

```typescript
interface PlayerData {
    championName: string
    // 英雄显示名，可能是本地化的
    // 例：中文客户端 → "阿狸"，英文客户端 → "Ahri"
    // ⚠️ 不能直接用于 DDragon URL

    rawChampionName: string
    // 英雄内部名，始终为英文
    // 格式："game_character_displayname_Ahri"
    // 用法：split('_').pop() → "Ahri" (可用于 DDragon URL)

    team: 'ORDER' | 'CHAOS'
    // 队伍标识
    // ORDER = 蓝色方 (左下出生点)
    // CHAOS = 红色方 (右上出生点)

    summonerSpells: {
        summonerSpellOne: {
            displayName: string
            // 本地化显示名
            // 例："闪现" (中文), "Flash" (英文)
            // 例："GeneratedTip_SummonerSpell_SummonerFlash_DisplayName" (异常格式)

            rawDisplayName: string
            // 内部名称
            // 例："GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"
            // 可能与 displayName 相同，也可能不同
        }
        summonerSpellTwo: {
            displayName: string
            rawDisplayName: string
        }
    }

    items: Array<{
        itemID: number
        // 装备 ID，对应 Data Dragon 装备数据
        // 例：3158 = 明朗之靴, 3171 = 绯红明朗
        // 注意：消耗品和饰品也会出现在列表中

        displayName: string      // 装备显示名
        count: number            // 数量
        price: number            // 价格
        rawDescription: string   // 原始描述
        rawDisplayName: string   // 内部名称
        slot: number             // 装备栏位 (0-6)
    }>

    riotId: string
    // Riot ID 格式："gameName#tagLine"
    // 例："Player1#NA1"
    // 注意：部分旧接口可能不包含此字段

    summonerName: string
    // 召唤师名称（旧系统）
    // 可能与 activeplayername 返回的名称匹配

    level: number               // 英雄等级 (1-18)
    position: string            // 空字符串（API 不提供位置信息）
    isBot: boolean              // 是否为 AI
    isDead: boolean             // 是否死亡
    respawnTimer: number        // 复活倒计时(秒)
    scores: {
        kills: number
        deaths: number
        assists: number
        creepScore: number
        wardScore: number
    }
}
```

**实际响应示例：**
```json
[
    {
        "championName": "Ahri",
        "rawChampionName": "game_character_displayname_Ahri",
        "team": "ORDER",
        "summonerSpells": {
            "summonerSpellOne": {
                "displayName": "Flash",
                "rawDisplayName": "GeneratedTip_SummonerSpell_SummonerFlash_DisplayName"
            },
            "summonerSpellTwo": {
                "displayName": "Ignite",
                "rawDisplayName": "GeneratedTip_SummonerSpell_SummonerDot_DisplayName"
            }
        },
        "items": [
            { "itemID": 3158, "displayName": "Ionian Boots of Lucidity", "count": 1, "price": 900, "slot": 0 },
            { "itemID": 1056, "displayName": "Doran's Ring", "count": 1, "price": 400, "slot": 1 }
        ],
        "riotId": "FoxLover#NA1",
        "summonerName": "FoxLover",
        "level": 11,
        "position": "",
        "isBot": false,
        "isDead": false,
        "respawnTimer": 0,
        "scores": { "kills": 5, "deaths": 2, "assists": 7, "creepScore": 142, "wardScore": 12.5 }
    }
]
```

**本项目使用的字段：**
- `team` — 区分敌我
- `rawChampionName` — 获取英文英雄名用于 DDragon URL
- `summonerSpells` — 检测召唤师技能
- `items[].itemID` — 计算装备急速
- `riotId` — 与 Riot API 关联的键
- `summonerName` — 匹配 activeplayername

---

### 8.3 /liveclientdata/gamestats

**用途：** 获取当前对局的基础统计信息。

**请求：**
```
GET https://127.0.0.1:2999/liveclientdata/gamestats
```

**响应：**
```typescript
interface GameStats {
    gameTime: number
    // 游戏已进行的秒数 (浮点数)
    // 0 = 选人阶段, >0 = 游戏已开始
    // 例：625.732 表示游戏进行了 10 分 25.732 秒

    gameMode: string
    // 游戏模式
    // "CLASSIC" = 召唤师峡谷 5v5
    // "ARAM" = 极地大乱斗
    // "TFT" = 云顶之弈
    // 其他："URF", "ONEFORALL" 等

    mapName: string        // 地图名
    mapNumber: number      // 地图编号
    mapTerrain: string     // 地图地形变体
}
```

**实际响应示例：**
```json
{
    "gameTime": 625.732421875,
    "gameMode": "CLASSIC",
    "mapName": "Map11",
    "mapNumber": 11,
    "mapTerrain": "Default"
}
```

**本项目使用的字段：**
- `gameTime` — 用于计算 comebackGameTime（技能冷却完成的游戏内时间）

---

### 8.4 /liveclientdata/activeplayername

**用途：** 获取当前登录玩家的名称。

**请求：**
```
GET https://127.0.0.1:2999/liveclientdata/activeplayername
```

**响应：** 纯字符串（不是 JSON 对象）

```
"FoxLover"
```

**用途：** 在 playerlist 中找到"自己"，从而确定"己方队伍"和"敌方队伍"。

**匹配逻辑：**
```typescript
const activePlayer = playerList.find(
    (p) => p.summonerName === activePlayerName || p.riotId === activePlayerName
)
const myTeam = activePlayer?.team ?? 'ORDER'  // 找不到时默认 ORDER
```

---

### 8.5 /liveclientdata/allgamedata

**用途：** 获取完整的游戏数据（包含上述所有子端点的数据，以及更多详情）。

**请求：**
```
GET https://127.0.0.1:2999/liveclientdata/allgamedata
```

**响应：**
```typescript
interface AllGameData {
    activePlayer: {
        summonerName: string
        riotId: string
        // + 大量其他字段：能力数据、符文数据、等级等
    }
    allPlayers: PlayerData[]  // 与 /playerlist 相同
    gameData: {
        gameTime: number      // 与 /gamestats 相同
        gameMode: string
        // + mapName, mapNumber 等
    }
    events: {
        Events: Array<{       // 游戏事件列表
            EventID: number
            EventName: string
            EventTime: number
            // + 事件相关数据
        }>
    }
}
```

**本项目不使用此端点进行常规轮询，原因：**
- 响应体积 30-200KB（vs 子端点总计 15-20KB）
- 包含大量无用数据（能力描述文本、符文描述等）
- 每 3 秒轮询时浪费带宽

---

### 8.6 SSL 证书处理

League Live Client Data API 使用自签名 SSL 证书。Node.js 默认会拒绝未经验证的证书。

```typescript
// 解决方案：设置 rejectUnauthorized: false
https.get(url, { rejectUnauthorized: false, timeout: 2000 }, callback)
```

**安全性说明：** 因为请求目标是 `127.0.0.1`（本机），不存在中间人攻击风险。

---

### 8.7 错误处理策略

```typescript
function fetchLeagueAPI(endpoint: string): Promise<unknown> {
    return new Promise((resolve) => {
        const req = https.get(url, options, (res) => {
            let data = ''
            res.on('data', (chunk) => (data += chunk))
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch {
                    resolve(null)  // JSON 解析失败 → 返回 null
                }
            })
        })
        req.on('error', () => resolve(null))    // 连接失败 → 返回 null
        req.on('timeout', () => {
            req.destroy()
            resolve(null)                        // 超时 → 返回 null
        })
    })
}
```

**设计原则：** 永远不抛异常，失败时返回 `null`。调用方通过检查 `null` 来判断 API 是否可用：
- 游戏未启动 → 连接失败 → `null`
- 游戏加载中 → 超时 → `null`
- API 返回异常数据 → JSON 解析失败 → `null`
- 正常响应 → 解析后的 JSON 对象

> **注意：** 此函数**不检查 HTTP 状态码**。即使服务器返回 4xx/5xx 错误，只要响应体是有效 JSON 就会被当作成功处理。同样，Riot API 的 `riotGet()` 函数也有此特性。对于本项目的使用场景，这不是问题——Live Client API 要么可用（200 + JSON）要么完全不可达（连接失败），不存在需要区分的 HTTP 错误场景。

---

## 9. Riot Games API 详解

### 9.1 Account API

**用途：** 将玩家的 Riot ID (gameName#tagLine) 转换为 PUUID。

**请求：**
```
GET https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
Headers: X-Riot-Token: {RIOT_API_KEY}
```

**路径参数：**
- `gameName` — Riot ID 的用户名部分（`#` 之前），需 URL 编码
- `tagLine` — Riot ID 的标签部分（`#` 之后），需 URL 编码

**响应：**
```json
{
    "puuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "gameName": "FoxLover",
    "tagLine": "NA1"
}
```

**地区选择：** `americas.api.riotgames.com`（美洲区域路由）
- 美洲：`americas.api.riotgames.com`
- 欧洲：`europe.api.riotgames.com`
- 亚太：`asia.api.riotgames.com`

**当前硬编码为美洲区域。** 如需支持其他区域需修改 `ACCOUNT_REGION` 常量。

---

### 9.2 Spectator API

**用途：** 获取正在进行中的对局的详细信息，包括所有参与者的符文。

**请求：**
```
GET https://na1.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/{puuid}
Headers: X-Riot-Token: {RIOT_API_KEY}
```

**路径参数：**
- `puuid` — 玩家的通用唯一标识符（从 Account API 获取）

**响应结构 (简化)：**
```typescript
{
    gameId: number              // 对局 ID
    gameType: string            // "MATCHED_GAME"
    gameMode: string            // "CLASSIC"
    gameStartTime: number       // 开始时间 (Unix 毫秒)
    mapId: number               // 地图 ID (11 = 召唤师峡谷)
    participants: Array<{
        puuid: string           // 玩家 PUUID
        teamId: number          // 队伍 ID (100 = 蓝色方, 200 = 红色方)
        championId: number      // 英雄 ID
        riotId: string          // Riot ID ("gameName#tagLine")

        spell1Id: number        // 召唤师技能1 ID
        spell2Id: number        // 召唤师技能2 ID

        perks: {
            perkIds: number[]
            // 符文 ID 列表（包含主系、副系、碎片等所有选择）
            // 例：[8229, 8226, 8210, 8237, 8347, 8345]
            //     8347 = Cosmic Insight (星界洞悉)

            perkStyle: number    // 主系符文树 ID
            perkSubStyle: number // 副系符文树 ID
        }
    }>
    bannedChampions: Array<{
        championId: number
        teamId: number
        pickTurn: number
    }>
}
```

**平台路由：** `na1.api.riotgames.com`（北美服务器）
- 北美：`na1.api.riotgames.com`
- 韩国：`kr.api.riotgames.com`
- 欧西：`euw1.api.riotgames.com`
- 等等

**当前硬编码为北美服务器。** 如需支持其他服务器需修改 `PLATFORM` 常量。

---

### 9.3 符文检测逻辑

**目标符文：** Cosmic Insight (星界洞悉)

| 属性 | 值 |
|------|-----|
| Perk ID | `8347` |
| 所属符文树 | 启迪 (Inspiration) |
| 位置 | 第三行 |
| 效果 | +18 召唤师技能急速 |

**检测代码：**
```typescript
const COSMIC_INSIGHT_ID = 8347
const COSMIC_INSIGHT_HASTE = 18

for (const participant of gameData.participants) {
    if (participant.teamId === myTeamId) continue  // 跳过己方

    const perkIds: number[] = participant.perks?.perkIds || []
    const runeHaste = perkIds.includes(COSMIC_INSIGHT_ID) ? COSMIC_INSIGHT_HASTE : 0
    const riotId = participant.riotId || ''
    if (riotId) {
        result[riotId] = runeHaste
    }
}
```

**返回格式：** `Record<string, number>` — riotId 到急速值的映射
```json
{
    "EnemyTop#NA1": 0,
    "EnemyJg#NA1": 18,
    "EnemyMid#NA1": 0,
    "EnemyADC#NA1": 18,
    "EnemySup#NA1": 0
}
```

---

## 10. Data Dragon CDN

**Data Dragon** 是 Riot Games 提供的静态资源 CDN，包含英雄头像、技能图标等。

**当前版本：** `16.5.1` (硬编码于 `src/constants/config.ts`)

### 英雄头像 URL

```
https://ddragon.leagueoflegends.com/cdn/{版本}/img/champion/{英雄名}.png
```

**示例：**
```
https://ddragon.leagueoflegends.com/cdn/16.5.1/img/champion/Ahri.png
https://ddragon.leagueoflegends.com/cdn/16.5.1/img/champion/LeeSin.png
https://ddragon.leagueoflegends.com/cdn/16.5.1/img/champion/KSante.png
```

**英雄名获取方式：**
```typescript
function getEnglishChampionName(player: PlayerData): string {
    // rawChampionName: "game_character_displayname_Ahri" → "Ahri"
    const raw = player.rawChampionName || ''
    if (raw.includes('_')) {
        const parts = raw.split('_')
        return parts[parts.length - 1]  // 取最后一段
    }
    return player.championName || ''  // 降级：可能是本地化名
}
```

### 召唤师技能图标 URL

```
https://ddragon.leagueoflegends.com/cdn/{版本}/img/spell/{技能key}.png
```

**技能名 → DDragon key 映射表：**

| 技能名 | DDragon Key | URL 示例 |
|--------|------------|---------|
| Flash | `SummonerFlash` | `.../spell/SummonerFlash.png` |
| Ignite | `SummonerDot` | `.../spell/SummonerDot.png` |
| Teleport | `SummonerTeleport` | `.../spell/SummonerTeleport.png` |
| Heal | `SummonerHeal` | `.../spell/SummonerHeal.png` |
| Ghost | `SummonerHaste` | `.../spell/SummonerHaste.png` |
| Exhaust | `SummonerExhaust` | `.../spell/SummonerExhaust.png` |
| Cleanse | `SummonerBoost` | `.../spell/SummonerBoost.png` |
| Barrier | `SummonerBarrier` | `.../spell/SummonerBarrier.png` |
| Smite | `SummonerSmite` | `.../spell/SummonerSmite.png` |
| Clarity | `SummonerMana` | `.../spell/SummonerMana.png` |

**图片加载失败处理：**
```typescript
<img
    src={iconUrl}
    onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none'
    }}
/>
```

---

## 11. Windows 原生集成

### 11.1 SendInput 键盘模拟

**文件：** `electron/sendInput.ts`

**技术方案：** 使用 `koffi`（纯 JS FFI 库）调用 Windows `user32.dll` 中的 `SendInput` 函数。

**加载的 Windows API 函数：**

```typescript
const user32 = koffi.load('user32.dll')

// 发送合成输入事件到系统
const SendInput = user32.func('__stdcall', 'SendInput', 'uint', [
    'uint',     // nInputs  — 输入事件数量
    'void *',   // pInputs  — INPUT 结构体数组 (原始 Buffer)
    'int',      // cbSize   — 单个 INPUT 结构体大小
])

// 虚拟键码 → 扫描码转换
const MapVirtualKeyW = user32.func('__stdcall', 'MapVirtualKeyW', 'uint', [
    'uint',     // uCode    — 虚拟键码
    'uint',     // uMapType — 映射类型 (0 = VK → 扫描码)
])

// 检查按键状态
const GetAsyncKeyState = user32.func('__stdcall', 'GetAsyncKeyState', 'short', [
    'int',      // vKey — 虚拟键码
])
```

**INPUT 结构体内存布局 (x64, 40 bytes)：**

```
Offset  Size    Field
0       4       type        = INPUT_KEYBOARD (1)
4       4       padding
8       2       wVk         = 虚拟键码 (Unicode模式=0)
10      2       wScan       = 扫描码 / UTF-16 字符码
12      4       dwFlags     = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
16      4       time        = 0 (系统自动填充)
20      8       dwExtraInfo = 0
28      12      padding (补齐到 40 bytes)
```

**KEYEVENTF_UNICODE 模式的优势：**
- 不需要处理键盘布局映射（QWERTY vs AZERTY 等）
- 直接发送 UTF-16 字符码
- 支持中文、日文、表情符号等任意 Unicode 字符
- 游戏聊天输入框能正确接收

---

### 11.2 GetAsyncKeyState 按键检测

```typescript
function isKeyDown(vk: number): boolean {
    return ((GetAsyncKeyState(vk) as number) & 0x8000) !== 0
}
```

**返回值位掩码：**
- `0x8000` (最高位) = 按键当前正被按住
- `0x0001` (最低位) = 自上次查询以来按键被按过

**使用的虚拟键码：**

| 常量 | 值 | 用途 |
|------|-----|------|
| `VK_TAB` | `0x09` | Tab 键（显隐覆盖层） |
| `VK_CONTROL` | `0x11` | Ctrl 键（Ctrl+V 检测） |
| `VK_V` | `0x56` | V 键（Ctrl+V 检测） |

---

## 12. 数据流架构

### 12.1 初始化流程

```
app.whenReady()
│
├── createWindow()
│   ├── 读取 electron-store: windowX, windowY, screenLocked
│   ├── 创建 BrowserWindow (transparent, frameless, alwaysOnTop)
│   ├── 设置 screen-saver 级别置顶
│   ├── 启动 5 秒置顶刷新定时器
│   ├── 注册 moved 事件 (防抖保存位置)
│   └── 加载 Vite dev server 或打包后的 index.html
│
├── createTray()
│   └── 创建系统托盘 (16×16 图标, 右键菜单)
│
└── registerShortcuts()
    └── 注册 Ctrl+Shift+L 全局热键

React 挂载 (renderer process)
│
└── App.tsx
    ├── useGameDetect() → 启动 3s API 轮询
    ├── useAutoClipboard() → 启动 1s 剪贴板同步
    ├── useScreenLock() → 同步锁定状态
    └── ResizeObserver → 监听内容尺寸 → 自动调整窗口
```

### 12.2 游戏检测流程

```
useGameDetect (每 3000ms)
│
├── Promise.all([getPlayerList(), getGameStats(), getActivePlayer()])
│
├── 全部失败或数据为空:
│   ├── failCount++
│   └── [failCount >= 5] → setGameState(false, null) + clearAllTimers()
│
├── 全部成功:
│   ├── failCount = 0
│   │
│   ├── 新游戏检测:
│   │   ├── gameTime < prevGameTime - 30 → 时间回退 → 清除全部
│   │   └── 英雄阵容变化 → 清除全部
│   │
│   ├── setGameState(true, gameTime)
│   │   └── 渲染进程: isInGame=true → 显示 TimerPanel
│   │   └── 主进程: enableInGameFeatures()
│   │       ├── 启动 Ctrl+V 轮询 (50ms)
│   │       └── 启动 Tab-hold 轮询 (50ms)
│   │
│   ├── [首次] 获取符文急速:
│   │   ├── Account API → PUUID
│   │   ├── Spectator API → 对局数据
│   │   └── 检查 Cosmic Insight → runeHasteMap
│   │
│   ├── parseEnemies(playerList, activePlayerName, runeHasteMap)
│   │   ├── 区分敌我队伍
│   │   ├── 位置分配 (Smite → JG, 其余按序)
│   │   ├── 计算急速 (装备 + 符文)
│   │   └── 返回 ParsedEnemy[]
│   │
│   └── updateEnemies(parsed) → 更新 Store
│       ├── 英雄未变: 保留计时器, 急速变化则按比例重算
│       └── 英雄变了: 创建新默认计时器
```

### 12.3 计时器启动流程

```
用户左键点击 SpellButton
│
├── [技能处于就绪/空闲状态 (isActive === false)]:
│   │
│   ├── startTimer(position, slot)  [Zustand action]
│   │   │
│   │   ├── 获取最新 gameTime (即时 API 调用)
│   │   │
│   │   ├── 计算冷却:
│   │   │   ├── baseCd = SPELL_COOLDOWNS[spellName]      // 例: Flash = 300
│   │   │   ├── afterHaste = floor(baseCd × 100 / (100 + haste))
│   │   │   │   // 例: floor(300 × 100 / 128) = 234 (有明朗之靴+星界洞悉)
│   │   │   └── actualCd = max(0, afterHaste - reactionDelay)
│   │   │       // 例: max(0, 234 - 2) = 232
│   │   │
│   │   ├── 存储:
│   │   │   ├── endsAt = Date.now() + actualCd × 1000
│   │   │   └── comebackGameTime = floor(gameTime) + actualCd
│   │   │
│   │   └── set() → Store 更新 → React 重渲染
│   │
│   └── useAutoClipboard 检测变化 → 格式化 → 写入剪贴板
│       └── "15:25Top"
│
├── [技能正在冷却中 (isActive === true)]:
│   └── adjustTimer(position, slot, -reactionDelay)
│       └── endsAt -= reactionDelay × 1000 (减少剩余冷却时间)
│
└── SpellButton 每秒重渲染 (useTickingTimer)
    ├── remaining = ceil((endsAt - Date.now()) / 1000)
    ├── [remaining > 0] → 显示 "M:SS" 倒计时
    └── [remaining <= 0] → 显示 ✓ + 脉冲动画
```

### 12.4 剪贴板自动同步流程

```
useAutoClipboard (每 1000ms 由 useTickingTimer 触发)
│
├── formatAllTimers(enemies)
│   │
│   ├── 遍历 5 个位置 × 2 个技能栏:
│   │   ├── [非活跃] → 跳过
│   │   ├── [非闪现] → 跳过 (仅同步 Flash 计时器)
│   │   ├── [已过期] → 跳过
│   │   │
│   │   ├── [有 comebackGameTime]:
│   │   │   └── "15:25Top" (游戏内时间格式)
│   │   │
│   │   └── [无 comebackGameTime]:
│   │       └── "4:35Top" (剩余时间格式)
│   │
│   └── 用空格连接: "15:25Top 20:00Mid 18:30Sup"
│
├── [文本变化] → electronAPI.copyToClipboard(text) → 写入系统剪贴板
│
└── [文本未变] → 跳过 (避免不必要的系统调用)
```

---

## 13. 配置常量

**文件：** `src/constants/config.ts`

### Data Dragon 版本
```typescript
export const DDRAGON_VERSION = '16.5.1'
```
⚠️ 硬编码，英雄联盟大版本更新后可能需要手动更新。

### 反应延迟补偿
```typescript
export const REACTION_COMPENSATION = 0  // 默认不补偿，用户可在设置中调整
```

### API 轮询间隔
```typescript
export const API_POLL_INTERVAL = 3000  // 3 秒
```

### 召唤师技能基础冷却 (秒)

| 技能 | 冷却 | 格式 |
|------|------|------|
| Flash | 300 | 5:00 |
| Teleport | 300 | 5:00 |
| Ignite | 180 | 3:00 |
| Heal | 240 | 4:00 |
| Ghost | 240 | 4:00 |
| Exhaust | 240 | 4:00 |
| Cleanse | 240 | 4:00 |
| Barrier | 180 | 3:00 |
| Smite | 15 | 0:15 |
| Clarity | 240 | 4:00 |

### 装备急速映射

| 装备 ID | 名称 | 急速值 |
|---------|------|--------|
| 3158 | 明朗之靴 (Ionian Boots of Lucidity) | +10 |
| 3171 | 绯红明朗 (Crimson Lucidity) | +20 |

### 位置顺序
```typescript
export const POSITIONS: Position[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP']
```

---

## 14. 类型定义

**文件：** `src/types/index.ts`, `src/types/electron.d.ts`

```typescript
// ===== 基础类型 =====

/** 5 个敌方位置 */
type Position = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP'

/** 技能栏位 */
type SpellSlot = 'spell1' | 'spell2'

/** 召唤师技能名称枚举 */
type SpellName =
    | 'Flash' | 'Ignite' | 'Teleport' | 'Heal' | 'Ghost'
    | 'Exhaust' | 'Cleanse' | 'Barrier' | 'Smite' | 'Clarity'

// ===== 计时器状态 =====

/** 单个技能计时器 */
interface SpellTimer {
    active: boolean              // 是否正在计时
    spellName: SpellName         // 技能名
    baseCooldown: number         // 基础冷却(秒)
    actualCooldown: number       // 实际冷却(秒, 含急速+反应延迟)
    endsAt: number               // 冷却结束时间戳 (Date.now() 格式)
    comebackGameTime: number | null  // 冷却结束的游戏时间(秒)
}

/** 单个敌方的完整状态 */
interface EnemyState {
    championName: string         // 英雄英文名
    championIconUrl: string      // DDragon 头像 URL
    haste: number                // 总急速值
    spell1: SpellTimer           // 技能1
    spell2: SpellTimer           // 技能2
}

/** 从 API 解析出的敌方数据 */
interface ParsedEnemy {
    position: Position
    championName: string
    spell1: SpellName
    spell2: SpellName
    haste: number
}

// ===== API 响应类型 =====

/** /liveclientdata/playerlist 响应项 */
interface PlayerData {
    championName: string
    team: 'ORDER' | 'CHAOS'
    summonerSpells: {
        summonerSpellOne: { displayName: string; rawDisplayName: string }
        summonerSpellTwo: { displayName: string; rawDisplayName: string }
    }
    items: Array<{ itemID: number }>
    rawChampionName: string
    summonerName: string
    riotId: string
}

/** /liveclientdata/gamestats 响应 */
interface GameStats {
    gameTime: number
    gameMode: string
}

/** /liveclientdata/allgamedata 响应 */
interface AllGameData {
    activePlayer: { summonerName: string; riotId: string }
    allPlayers: PlayerData[]
    gameData: { gameTime: number; gameMode: string }
}
```

### 渲染进程全局类型扩展 (`electron.d.ts`)

```typescript
export interface ElectronAPI {
    copyToClipboard: (text: string) => Promise<void>
    getPlayerList: () => Promise<PlayerData[] | null>
    getGameStats: () => Promise<GameStats | null>
    getActivePlayer: () => Promise<string | null>
    getAllGameData: () => Promise<AllGameData | null>
    savePosition: (pos: { x: number; y: number }) => void
    closeApp: () => void
    minimizeApp: () => void
    toggleScreenLock: () => void
    getScreenLock: () => Promise<boolean>
    onScreenLockChanged: (callback: (locked: boolean) => void) => () => void
    setWindowSize: (width: number, height: number) => void
    setIgnoreMouseEvents: (ignore: boolean) => void
    setInGame: (inGame: boolean) => void
    // ⚠️ 缺失：getEnemyRuneHaste 已在 preload.ts 中暴露但此处未声明
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
```

---

## 15. 未使用 / 休眠接口

以下功能已在代码中定义，但当前未被任何组件或逻辑调用：

| 接口 | 定义位置 | 说明 |
|------|---------|------|
| `AdjustButtons` 组件 | `src/components/AdjustButtons.tsx` | ±2秒微调按钮组件。已导出但未被 `TimerRow` 或其他组件导入渲染。 |
| `swapPositions(posA, posB)` | `src/store/timerStore.ts:219` | 交换两个位置的敌方数据。Store 中已实现但无 UI 调用入口。 |
| `getAllGameData()` | `electron.d.ts` + `preload.ts` + `main.ts` | 获取完整游戏数据的 IPC 通道。已注册但渲染进程未调用（改用 3 个子端点）。 |
| `savePosition(pos)` | `electron.d.ts` + `preload.ts` + `main.ts` | 手动保存窗口位置。已注册但渲染进程未调用（改用 `moved` 事件自动保存）。 |
| `closeApp()` | `electron.d.ts` + `preload.ts` + `main.ts` | 关闭应用。已注册但渲染进程未调用（用户通过托盘菜单退出）。 |

> 这些接口保留在代码中作为扩展点或历史遗留。如需精简代码库，可安全移除。

---

## 16. 文件持久化说明

### 项目目录内的文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `.env` | 配置 | Riot API Key，不提交 Git |

### 项目目录外的文件

> **注意：** 代码中未自定义 `electron-store` 的存储路径，实际路径由 Electron 的 `app.getPath('userData')` 决定，通常为 `%APPDATA%\{productName}\`。具体文件夹名取决于 `package.json` 中的 `build.productName` 或 `name` 字段。

| 路径 | 创建者 | 说明 |
|------|--------|------|
| `%APPDATA%\{appName}\config.json` | electron-store | 持久化设置 (windowX/Y, screenLocked) |
| `%APPDATA%\{appName}\Cache\` | Electron | 浏览器缓存，自动管理 |
| `%APPDATA%\{appName}\Code Cache\` | Electron | V8 代码缓存，自动管理 |

**清理方式：** 找到并删除 `%APPDATA%` 下对应的应用文件夹即可完全清除外部文件。

---

## 17. 构建与运行

### 开发模式
```bash
npm run dev
# 启动 Vite 开发服务器 + Electron 主进程
# 支持 HMR (热模块替换)
```

### 生产构建
```bash
npm run build
# 1. tsc — TypeScript 编译检查
# 2. vite build — 打包 React 应用到 dist/
# 3. electron-builder — 打包为 Windows .exe 安装程序到 release/
```

### 构建输出

```
release/
├── JiJiGuGu Overlay Setup {version}.exe    # NSIS 安装程序
└── win-unpacked/                            # 解压版（可直接运行）
    └── JiJiGuGu Overlay.exe
```

### 构建配置 (package.json → build)

```json
{
    "appId": "com.jijigugu.overlay",
    "productName": "JiJiGuGu Overlay",
    "directories": { "output": "release" },
    "files": [
        "dist/**/*",           // React 打包产物
        "dist-electron/**/*",  // Electron 主进程编译产物
        "build/**/*"           // 静态资源 (logo)
    ],
    "win": {
        "target": "nsis",      // NSIS 安装程序格式
        "icon": "build/logo.ico"
    },
    "nsis": {
        "oneClick": false,                        // 不是一键安装
        "allowToChangeInstallationDirectory": true // 允许自定义安装路径
    }
}
```

---

## 18. 安全与合规

### 安全实践

| 项目 | 实现 | 说明 |
|------|------|------|
| Context Isolation | `contextIsolation: true` | 渲染进程与 Node.js 环境隔离 |
| Node Integration 禁用 | `nodeIntegration: false` | 渲染进程不能直接访问 Node.js API |
| Preload Bridge | `contextBridge.exposeInMainWorld` | 仅暴露最小必要的 API |
| 无内存注入 | SendInput API | 合法的 Windows API，不修改游戏内存 |
| 只读 API | Live Client API | 仅读取游戏数据，不修改任何内容 |
| API Key 保护 | `.env` + `.gitignore` | Riot API Key 不提交到版本控制 |

### Riot Games 合规性

- **League Live Client API** — 官方公开 API，明确允许第三方工具使用
- **Spectator API** — 官方 API，需要有效的 API Key
- **剪贴板写入** — 每秒自动同步闪现计时器到系统剪贴板（自动写入）
- **剪贴板粘贴** — 玩家手动按 Ctrl+V 触发 SendInput 输入（手动触发）
- **覆盖层显示** — 与 Overwolf、Porofessor 等同类工具一致

### Windows API 使用

- `SendInput()` — 合法的用户输入模拟 API
- `GetAsyncKeyState()` — 合法的按键状态查询 API
- 不使用任何游戏内存读写、DLL 注入或 Hook 技术
