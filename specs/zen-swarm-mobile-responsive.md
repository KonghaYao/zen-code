# zen-swarm 移动端响应式布局改造

## 概述

将 zen-swarm Web
UI 从纯桌面端 macOS 风格布局改造为支持移动端的响应式布局。保留桌面端完整体验不变，在手机端提供简化但功能完整的界面。

**优先级**：平衡模式（功能完整 + 合理美观） **参考风格**：Claude.ai 移动端 **目标用户**：手机访问 zen-swarm 的用户

---

## 断点策略

**两档响应式**，使用 Tailwind CSS 标准前缀：

| 档位 | 范围                    | 体验                        |
| ---- | ----------------------- | --------------------------- |
| 手机 | `< 768px`（`md:` 以下） | 简化移动端布局              |
| 桌面 | `≥ 768px`（`md:` 以上） | 保持现有 macOS 风格完整体验 |

---

## 布局结构变化

### 桌面端（保持不变）

```
┌─────────────────────────────────┐
│ MenuBar (28px 状态栏)            │  ← macOS 风格顶部状态栏
├─────────────────────────────────┤
│                                 │
│   AppWindow (当前激活的页面)      │  ← 带 traffic lights 的窗口
│                                 │
├─────────────────────────────────┤
│  🗨️  ⚙️  📁  📊  🔄  ⏰  💻     │  ← macOS Dock（磁吸动画）
└─────────────────────────────────┘
```

### 移动端（新增）

```
┌─────────────────────────────────┐
│ MobileHeader (简化顶部)          │  ← 标题 + 操作按钮
├─────────────────────────────────┤
│                                 │
│   当前页面内容（全屏，无窗口边框） │  ← 无 AppWindow 包装
│                                 │
│                                 │
├─────────────────────────────────┤
│  💬  🔍  🗂️  ✅  ⚙️             │  ← 底部 Tab Bar（5 个主要 Tab）
└─────────────────────────────────┘
```

---

## 核心组件改造

### 1. DockLayout.tsx（主布局）

**变化**：

- 检测移动端视口，切换到 `MobileLayout` 结构
- 桌面：保持现有 `MenuBar + main + DockContainer`
- 移动：使用 `MobileHeader + main(全屏) + MobileTabBar`
- 移动端 main 区域 padding 去掉 `p-6`，内容全屏展示

```tsx
// 响应式判断（使用 hook）
const isMobile = useIsMobile(); // 基于 window.innerWidth < 768

// 移动端不用 AppWindow 包装
if (isMobile) {
    return <MobileLayout>...</MobileLayout>;
}
```

### 2. 新增 MobileTabBar 组件

**位置**：`zen-swarm/src/frontend/components/mobile/MobileTabBar.tsx`

**功能**：

- 固定在屏幕底部，高度 56px（适合拇指触控）
- 5 个核心 Tab：Chat、Finder、Workspace、Tasks/Monitor、Config
- 当前激活 Tab 用主色高亮 + 图标变化
- iOS safe area 支持（`pb-safe`）

**Tab 列表**（从 7 个精选 5 个）：

| Tab        | 对应 AppId | 图标     | 说明               |
| ---------- | ---------- | -------- | ------------------ |
| 💬 Chat    | `chat`     | 对话气泡 | 核心功能，默认选中 |
| 🔍 Finder  | `finder`   | 文件夹   | 文件浏览           |
| 🗂️ Monitor | `monitor`  | 列表图标 | 任务/进程监控      |
| ⏰ Cron    | `cron`     | 时钟图标 | 定时任务           |
| ⚙️ Config  | `config`   | 齿轮     | 配置管理           |

> State Machine 和 Terminal 暂不在移动端底部 Tab 中展示（仍可通过 Config 进入或直接 URL 访问）

### 3. 新增 MobileHeader 组件

**位置**：`zen-swarm/src/frontend/components/mobile/MobileHeader.tsx`

**功能**：

- 高度 52px，背景磨砂玻璃
- 左：当前页面名称（或 Zen Swarm logo）
- 右：页面相关操作按钮（如 Chat 页的历史按钮、设置按钮）
- 通过 context 或 props 接收当前页面的操作配置

### 4. ChatView.tsx（移动端适配）

**移动端简化**：

- 隐藏左侧 `HistoryGroupedSidebar`（`hidden md:flex`）
- 隐藏右侧 `ConfigDrawer`（`hidden md:block`）
- Chat 主面板全屏展示

**移动端新增访问方式**：

- 顶部 Header 左侧加「历史」图标按钮 → 底部弹出抽屉式历史记录
- 顶部 Header 右侧加「设置」图标按钮 → 打开 ConfigDrawer 浮层

**Chat 输入框**：

- 适配软键盘弹出（监听 `visualViewport` resize）
- 输入框粘附于软键盘上方

### 5. AppWindow.tsx（移动端隐藏）

移动端不渲染 AppWindow 包装器（Traffic Lights、窗口标题栏、圆角卡片），直接渲染内容组件。

### 6. 其他页面简化（最小改动）

| 页面        | 移动端改动                        |
| ----------- | --------------------------------- |
| ConfigView  | 将多栏 Tab 布局改为纵向堆叠或全宽 |
| FinderView  | 隐藏预览面板，仅显示文件列表      |
| MonitorView | 表格改为卡片列表                  |
| CronView    | 保持现有布局，加横向滚动          |

---

## 新增工具和 Hook

### `useIsMobile` Hook

```typescript
// zen-swarm/src/frontend/hooks/useIsMobile.ts
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    return isMobile;
}
```

---

## 实施步骤

### Phase 1：基础框架（必做）

1. **新增 `useIsMobile` Hook**
    - `zen-swarm/src/frontend/hooks/useIsMobile.ts`

2. **新增 `MobileTabBar` 组件**
    - `zen-swarm/src/frontend/components/mobile/MobileTabBar.tsx`
    - 5 个 Tab，使用现有 DockIcon 组件复用图标

3. **新增 `MobileHeader` 组件**
    - `zen-swarm/src/frontend/components/mobile/MobileHeader.tsx`
    - 简化版顶部导航栏

4. **改造 `DockLayout.tsx`**
    - 引入 `useIsMobile`
    - 移动端：使用 MobileHeader + 全屏内容 + MobileTabBar
    - 桌面端：保持现有结构不变

### Phase 2：Chat 页面适配（核心）

5. **改造 `ChatView.tsx`**
    - HistoryGroupedSidebar：`hidden md:flex`
    - ConfigDrawer：`hidden md:block`
    - 添加移动端历史抽屉（`MobileHistoryDrawer`）
    - 适配软键盘（visualViewport）

6. **改造 `ChatPanel.tsx`**
    - 输入区域底部安全区适配
    - 移动端消息气泡布局微调

### Phase 3：其他页面适配

7. **ConfigView 响应式**
    - 多栏 → 单栏（`flex-col md:flex-row`）

8. **FinderView 响应式**
    - 隐藏文件预览面板（`hidden md:block`）

9. **MonitorView 响应式**
    - 表格 → 卡片列表（`block md:table`）

10. **CronView 响应式**
    - 内容区横向可滚动

### Phase 4：细节打磨

11. **iOS Safe Area 支持**
    - `env(safe-area-inset-bottom)` 底部内边距

12. **触摸交互优化**
    - 移除 hover-only 样式
    - 触控目标 ≥ 44px

13. **测试与验证**
    - Chrome DevTools 设备模拟
    - 真机测试（iPhone Safari）

---

## 文件清单

### 新增文件

```
zen-swarm/src/frontend/
├── hooks/
│   └── useIsMobile.ts                    # 新增
├── components/
│   └── mobile/
│       ├── MobileTabBar.tsx              # 新增
│       ├── MobileHeader.tsx              # 新增
│       └── index.ts                      # 新增
```

### 修改文件

```
zen-swarm/src/frontend/
├── layouts/
│   └── DockLayout.tsx                    # 改造（响应式切换）
├── views/
│   ├── ChatView.tsx                      # 改造（侧栏隐藏）
│   ├── ConfigView.tsx                    # 改造（单栏布局）
│   ├── Finder/index.tsx                  # 改造（隐藏预览）
│   ├── MonitorView.tsx                   # 改造（卡片布局）
│   └── CronView.tsx                      # 改造（横向滚动）
├── components/
│   ├── ChatPanel.tsx                     # 改造（软键盘适配）
│   └── HistoryGroupedSidebar.tsx         # 改造（移动端抽屉版）
└── global.css                            # 改造（safe area 变量）
```

---

## 设计约束

- **不破坏桌面端**：所有改动必须对 `md:` 以上无影响
- **最小改动原则**：能用 Tailwind 响应式前缀解决的，不新增组件
- **复用现有图标**：MobileTabBar 复用 dock/icons 中已有的图标组件
- **动画保留**：Motion 页面切换动画在移动端保留（减少 spring stiffness 让其更轻盈）
