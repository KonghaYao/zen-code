# macOS 红绿灯设计系统 - zen-swarm

## 概述

将 zen-swarm 应用的所有 Panel 组件统一为 macOS 风格的红绿灯设计，提供一致的视觉体验和交互模式。

## 需求确认

| 项目        | 决策                         |
| ----------- | ---------------------------- |
| 红绿灯功能  | 有关闭功能（关闭窗口/面板）  |
| 应用位置    | 所有 Panel 面板              |
| Header 背景 | 完全透明（纯透明背景）       |
| 交互效果    | 简化版（始终显示彩色圆点）   |
| 按钮位置    | 左上角（macOS 标准位置）     |
| 实现方式    | 创建新的 macOSPanel 包装组件 |

## 技术方案

### 1. TrafficLights 组件

创建可复用的红绿灯按钮组件：

```tsx
// components/ui/TrafficLights.tsx
interface TrafficLightsProps {
    onClose?: () => void;
    disabled?: boolean;
}
```

**样式规范**：

- 三个圆点：红、黄、绿（标准 macOS 颜色）
- 尺寸：12px 直径
- 间距：8px
- 简化版：始终显示彩色圆点，无 hover 图标变化
- 点击红色按钮触发 `onClose`

### 2. macOSPanel 包装组件

创建新的包装组件，自动包含红绿灯：

```tsx
// components/ui/macOSPanel.tsx
interface MacOSPanelProps {
    title?: string;
    onClose?: () => void;
    children: React.ReactNode;
    className?: string;
}
```

**布局结构**：

```
┌─────────────────────────────────┐
│ 🔴 🟡 🟢    [Title]             │  <- 透明背景 Header
├─────────────────────────────────┤
│                                 │
│         Content Area            │
│                                 │
└─────────────────────────────────┘
```

### 3. Header 透明设计

- 移除 Header 背景色
- 使用 `bg-transparent` 或 `background: transparent`
- 可能需要调整边框样式以保持视觉层次

## 文件变更计划

### 新增文件

| 文件路径                          | 说明                      |
| --------------------------------- | ------------------------- |
| `components/ui/TrafficLights.tsx` | 红绿灯按钮组件            |
| `components/ui/MacOSPanel.tsx`    | macOS 风格 Panel 包装组件 |

### 修改文件

| 文件路径                           | 变更内容                        |
| ---------------------------------- | ------------------------------- |
| `components/ui/Panel.tsx`          | 添加红绿灯支持或创建别名        |
| `components/panels/*/index.tsx`    | 使用 macOSPanel 替换现有布局    |
| `components/desktop/AppWindow.tsx` | 添加红绿灯到窗口标题栏          |
| `styles/globals.css`               | 添加红绿灯相关 CSS 变量（可选） |

## 涉及的 Panel 组件

需要改造的 Panel 列表：

1. **ModelsPanel** - `components/panels/ModelsPanel/index.tsx`
2. **AgentPanel** - `components/panels/AgentPanel/index.tsx`
3. **MiddlewaresPanel** - `components/panels/MiddlewaresPanel/index.tsx`
4. **ToolsPanel** - `components/panels/ToolsPanel/index.tsx`
5. **SkillsPanel** - `components/panels/SkillsPanel/index.tsx`
6. **MCPPanel** - `components/panels/MCPPanel/index.tsx`
7. **PromptsPanel** - `components/panels/PromptsPanel/index.tsx`
8. **ChatPanel** - `components/ChatPanel.tsx`
9. **HistoryPanel** - `components/HistoryPanel.tsx`

## 样式规范

### 颜色定义

```css
:root {
    --traffic-light-close: #ff5f57; /* 红色 - 关闭 */
    --traffic-light-minimize: #febc2e; /* 黄色 - 最小化 */
    --traffic-light-maximize: #28c840; /* 绿色 - 最大化 */
}
```

### 尺寸规范

```css
.traffic-light {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
}

.traffic-lights-container {
    display: flex;
    gap: 8px;
    padding-left: 12px;
}
```

## 实施步骤

### Phase 1: 基础组件

1. 创建 `TrafficLights.tsx` 组件
2. 创建 `MacOSPanel.tsx` 包装组件
3. 添加 CSS 变量

### Phase 2: 迁移现有 Panel

1. 更新 `GenericPanel` 支持红绿灯
2. 逐个迁移 panels/ 下的组件
3. 更新 AppWindow 组件

### Phase 3: 优化与测试

1. 确保所有 Panel 关闭功能正常
2. 检查透明 Header 视觉效果
3. 响应式适配测试

## 验收标准

- [x] 所有 Panel 左上角显示红绿灯按钮
- [x] 点击红色按钮能关闭 Panel
- [x] Header 背景完全透明
- [x] 红绿灯始终显示（简化版）
- [x] 视觉风格与 macOS 一致

---

**实现状态**: ✅ 已完成 **完成日期**: 2026-02-22 **备注**:
TrafficLights 和 MacOSPanel 组件已实现，AppWindow 组件已集成红绿灯功能。

## 后续优化（可选）

- 考虑添加拖拽功能（通过标题栏移动窗口）
- 考虑添加最小化/最大化功能
- 支持 dark mode 颜色变体
