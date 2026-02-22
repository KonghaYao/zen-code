---
name: macos-dock-component-implementation
description:
    'macOS 风格 Dock 组件的完整实现方案；使用纯 CSS 实现磨砂玻璃效果（backdrop-filter: blur + saturate），JS
    计算鼠标距离驱动图标大小变化，CSS 变量控制过渡动画；关键技术点：固定容器高度避免图标放大撑高 dock、cubic-bezier
    弹性曲线、多层阴影营造深度；适用于需要 macOS 风格底部任务栏的 React 项目'
tags:
    - macos-ui
    - dock-component
    - frosted-glass
    - css-animation
    - react
category: architecture
created: 2025-01-18
last_updated: 2026-02-22
priority: high
context_scope: project
status: completed
completion_date: 2026-02-22
---

# ## 背景

## 背景

zen-swarm 项目需要实现一个 macOS 风格的 Dock 组件，要求：

- 磨砂玻璃透明效果
- 鼠标靠近时图标放大
- 边框和背景符合 macOS 设计语言

## 解决方案

### 1. 磨砂玻璃效果（CSS）

```css
.dock-container {
    /* 磨砂玻璃核心样式 */
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(30px) saturate(180%);

    /* 柔和边框 + 内发光 */
    border: 0.5px solid rgba(255, 255, 255, 0.4);
    box-shadow:
        0 0 0 0.5px rgba(0, 0, 0, 0.04),
        0 2px 4px rgba(0, 0, 0, 0.04),
        0 8px 16px rgba(0, 0, 0, 0.08),
        0 24px 48px rgba(0, 0, 0, 0.08),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.6);

    /* 固定高度避免放大时容器变形 */
    height: 4.125rem; /* 66px */
    min-height: 4.125rem;
    border-radius: 1.375rem; /* 22px */
}
```

### 2. 放大动画（JS + CSS 变量）

**JS 计算距离**（`zen-swarm/src/frontend/components/dock/DockContainer.tsx:50-70`）：

```typescript
const calculateSizes = (mouseX: number) => {
    const items = dockRef.current?.querySelectorAll('.dock-item');
    items?.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - itemCenterX);
        const maxDistance = 150; // 影响范围
        const minSize = 52,
            maxSize = 76;

        if (distance < maxDistance) {
            const ratio = 1 - distance / maxDistance;
            const size = minSize + (maxSize - minSize) * Math.pow(ratio, 1.5);
            (item as HTMLElement).style.setProperty('--dock-item-size', `${size}px`);
        } else {
            (item as HTMLElement).style.setProperty('--dock-item-size', `${minSize}px`);
        }
    });
};
```

**CSS 过渡动画**（`zen-swarm/src/frontend/global.css:650-680`）：

```css
.dock-item {
    width: var(--dock-item-size, 3.25rem);
    height: var(--dock-item-size, 3.25rem);
    transition:
        width 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dock-icon-btn:hover {
    transform: translateY(-0.5rem);
}
```

### 3. 文件结构

- `zen-swarm/src/frontend/components/dock/DockContainer.tsx`：主容器，处理鼠标事件和右键菜单
- `zen-swarm/src/frontend/components/dock/DockAppItem.tsx`：单个图标组件
- `zen-swarm/src/frontend/global.css`：所有 Dock 样式（650-750 行）

### 4. 关键技术决策

| 问题     | 原方案                              | 最终方案               | 原因                  |
| -------- | ----------------------------------- | ---------------------- | --------------------- |
| 样式实现 | class-variance-authority + Tailwind | 纯 CSS                 | 更贴近 macOS 原生效果 |
| 放大动画 | motion/react                        | JS 计算距离 + CSS 变量 | 性能更好，更容易控制  |
| 容器高度 | 自动高度                            | 固定 4.125rem          | 避免图标放大撑高 dock |
| 图标背景 | 白色背景                            | 透明 + 悬停背景        | 符合 macOS 设计       |

## 适用场景

- 需要底部任务栏的桌面应用 UI
- 需要磨砂玻璃效果的现代 UI
- 需要类似 macOS 的图标放大交互

## 注意事项

1. **高度必须固定**：避免 `height: auto`，否则图标放大会撑高容器
2. **CSS 变量默认值**：使用 `var(--dock-item-size, 3.25rem)` 确保降级显示
3. **弹性曲线**：`cubic-bezier(0.34, 1.56, 0.64, 1)` 提供轻微回弹效果
4. **Dark Mode**：需要单独定义 dark 模式的背景和边框颜色

## 实施验证 ✅

### 已实现组件

- ✅ `DockContainer.tsx` - 主容器，处理鼠标事件和右键菜单
- ✅ `DockAppItem.tsx` - 单个图标组件
- ✅ `DockContextMenu.tsx` - 右键菜单

### 关键实现验证

1. **磨砂玻璃效果** ✅
    - CSS 路径：`zen-swarm/src/frontend/global.css:785-810`
    - 实现方式：`backdrop-filter: blur(30px) saturate(180%)`
    - 多层阴影：5 层 box-shadow 营造深度

2. **放大动画** ✅
    - JS 计算：`DockContainer.tsx:50-70` `calculateSizes()` 函数
    - CSS 变量：`--dock-item-size` 控制图标大小
    - 过渡动画：`global.css:815-825` 使用 cubic-bezier(0.34, 1.56, 0.64, 1)

3. **固定容器高度** ✅
    - `height: 4.125rem` (66px)
    - `min-height: 4.125rem` 防止变形

4. **键盘快捷键** ✅
    - Cmd+1 到 Cmd+9 快速切换应用
    - 在 `DockContainer.tsx` useEffect 中实现

5. **右键菜单** ✅
    - `DockContextMenu.tsx` 完整实现
    - 菜单项：打开、帮助、通知

## 集成到 Dock 系统 ✅

已集成到 zen-swarm 的 DockLayout 架构：

- `DockContainer` 作为主 Dock 组件
- 与 `app-registry/registry.ts` 集成
- 支持动态应用注册和通知系统
