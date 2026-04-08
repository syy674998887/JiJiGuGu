<p align="center">
  <img src="build/logo.png" width="100" />
</p>

<h1 align="center">叽叽咕咕 · JiJiGuGu</h1>

<p align="center">
  英雄联盟召唤师技能计时器 & 覆盖层工具<br>
  <em>LoL Summoner Spell Timer & Overlay</em>
</p>

<p align="center">
  <a href="https://github.com/syy674998887/JiJiGuGu/releases/latest">📥 下载最新版本</a>
</p>

---

## 功能一览

### 技能冷却追踪
- 实时追踪 5 名敌方的召唤师技能冷却（闪现、传送、点燃等）
- 左键点击开始计时，右键点击重置
- 冷却中再次左键点击自动减去反应延迟（修正启动偏差）
- 冷却结束时绿色脉冲动画提示 ✓

### 智能急速计算
- 自动检测敌方装备带来的召唤师技能急速（明悟之靴 +10 / 绯红明悟 +20）
- 装备变化时按比例动态调整正在进行的计时器
- 通过 **Riot API** 自动检测敌方符文（星界洞悉 +18 急速），每局仅调用一次

### Doinb 计时（自动剪贴板同步）
- 每秒自动将活跃的闪现计时写入系统剪贴板
- 格式示例：`15:25Top 20:00Mid 18:30Sup`
- 游戏内 `Ctrl+V` 直接粘贴到聊天框，通过 Windows SendInput 绕过 LoL 独立剪贴板限制
- 无需管理员权限

### 覆盖层控制
- **Tab 按住** 显示面板，松开自动隐藏（与游戏记分板同步）
- 始终置顶（`screen-saver` 级别），全屏/无边框游戏中均可正常显示
- 鼠标悬停自动恢复交互，离开后穿透点击
- `Ctrl+Shift+L` 锁定/解锁窗口位置，防止误拖动

### 自动对局检测
- 自动检测对局开始/结束，无需手动操作
- 进入对局后自动识别敌方英雄、召唤师技能和装备
- 智能位置分配：惩戒持有者 → 打野，其余按顺序分配
- 新对局自动清除上局计时

### 设置面板
- **Reaction Delay** — 反应延迟补偿（0-10 秒），从 CD 中减去
- **Flash Only** — 仅影响覆盖层显示，简化界面；剪贴板始终只同步闪现计时
- **Riot API Key** — 在设置中输入 API Key，失去焦点或按 Enter 时验证状态
- **Debug** — 显示当前剪贴板预览文本

### 其他特性
- 最小化到系统托盘，不占用任务栏
- 窗口位置和设置自动保存（跨重启持久化）
- 单实例锁定，防止重复打开
- 窗口大小根据内容自动适配

---

## 快速开始

### 安装使用

1. 从 [Releases](https://github.com/syy674998887/JiJiGuGu/releases/latest) 下载安装包并安装
2. 启动 JiJiGuGu，等待进入游戏
3. (可选) 在设置中填入 [Riot API Key](https://developer.riotgames.com) 以启用符文急速检测
4. 进入对局后，按住 `Tab` 查看敌方技能面板
5. 看到敌人交闪现时，点击对应技能按钮开始计时
6. 在游戏聊天框中按 `Ctrl+V` 即可发送计时信息给队友

### 开发构建

```bash
# 安装依赖
npm install

# 开发模式（Vite HMR + Electron）
npm run dev

# 生产构建 + 打包 Windows 安装程序
npm run build
```

---

## 快捷键

| 按键 | 功能 |
|------|------|
| `Tab`（按住） | 在游戏中显示/隐藏覆盖层 |
| `左键点击` 技能 | 开始计时 / 冷却中再次点击减去反应延迟 |
| `右键点击` 技能 | 重置计时 |
| `Ctrl+V` | 游戏内粘贴计时信息 |
| `Ctrl+Shift+L` | 锁定/解锁窗口位置 |

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | ^28.1.0 | 桌面应用框架，透明置顶窗口 |
| [React](https://react.dev/) | ^18.2.0 | UI 组件化 |
| [TypeScript](https://www.typescriptlang.org/) | ^5.2.2 | 类型安全 |
| [Vite](https://vitejs.dev/) | ^5.0.8 | 前端构建 + HMR |
| [Zustand](https://zustand-demo.pmnd.rs/) | ^5.0.0 | 轻量状态管理 |
| [electron-store](https://github.com/sindresorhus/electron-store) | ^8.1.0 | 配置持久化 |
| [koffi](https://koffi.dev/) | ^2.9.0 | Windows FFI（SendInput 键盘模拟） |

---

## 项目结构

```
JiJiGuGu/
├── electron/                        # Electron 主进程
│   ├── main.ts                      # 窗口管理、IPC、API 代理、游戏内功能
│   ├── preload.ts                   # Context Bridge 安全暴露 API
│   ├── riotApi.ts                   # Riot API 集成（符文急速检测）
│   └── sendInput.ts                 # Windows SendInput FFI（键盘模拟）
│
├── src/                             # React 渲染进程
│   ├── App.tsx                      # 根组件
│   ├── components/                  # UI 组件
│   │   ├── TitleBar.tsx             # 标题栏（Logo、锁定、设置、最小化）
│   │   ├── ClipboardSync.tsx        # 剪贴板同步副作用组件（不渲染 UI）
│   │   ├── TimerPanel.tsx           # 计时面板（5 行 TimerRow）
│   │   ├── TimerRow.tsx             # 单行：英雄头像 + 位置 + 技能按钮
│   │   ├── SpellButton.tsx          # 技能按钮（点击计时、右键重置、倒计时）
│   │   ├── CopyAllButton.tsx        # 剪贴板预览（Debug 模式）
│   │   └── SettingsPanel.tsx        # 设置面板
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useGameDetect.ts         # 游戏检测（轮询 API、解析敌方）
│   │   ├── useAutoClipboard.ts      # 自动剪贴板同步
│   │   ├── useScreenLock.ts         # 屏幕锁定状态
│   │   └── useTickingTimer.ts       # 全局 1 秒 Ticker
│   ├── services/gameData.ts         # 敌方数据解析（cleanSpellName、位置分配）
│   ├── store/timerStore.ts          # Zustand 状态管理
│   ├── utils/                       # 工具函数
│   │   ├── spells.ts                # 冷却计算
│   │   ├── format.ts                # 计时文本与剪贴板格式化
│   │   └── icons.ts                 # DDragon CDN 图标 URL
│   ├── constants/config.ts          # 配置常量（CD 表、装备急速、API 间隔）
│   ├── types/                       # TypeScript 类型
│   └── styles/index.css             # LoL 暗色主题样式
│
├── build/                           # 应用图标
├── vite.config.ts                   # Vite + Electron 插件配置
└── package.json                     # 依赖与构建配置
```

---

## 核心设计

| 设计点 | 方案 |
|--------|------|
| 数据来源 | League Live Client API（3 个子端点并行，轻量高效） |
| 计时方式 | 绝对时间戳，无累积漂移 |
| 游戏内输入 | 剪贴板 + Windows SendInput，无需管理员权限 |
| 窗口行为 | 始终置顶 + 透明度切换，不抢游戏焦点 |

---

## 注意事项

- **游戏模式**：覆盖层在无边框窗口和全屏模式下均有效
- **API 可用性**：League Live Client API 仅在对局中可用，排队/大厅时不可用
- **Riot API Key**：开发者 Key 每 24 小时过期，需在 [developer.riotgames.com](https://developer.riotgames.com) 重新生成。不填写时仅缺失符文急速检测，核心功能不受影响
- **安全合规**：仅读取官方公开 Live Client API + 手动剪贴板操作，不修改游戏内存、不自动发送按键

---

## 许可证

[MIT](LICENSE) © 2026 Untargetable
