---
name: "shadcn-tailwind-border-ring-fix"
description: "shadcn/ui 的 border 和 focus-visible 样式修复方案；解决 tailwind.config.js 空主题配置导致的颜色映射问题和 CSS 硬编码冲突；包含完整的颜色变量配置、--ring 颜色调整和 @apply 指令使用注意事项"
tags: ["shadcn", "tailwind", "css-variables", "focus-visible", "theme-configuration"]
category: "bug-fix"
created: "2025-01-17"
last_updated: "2025-01-17"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

使用 shadcn/ui 时发现：
1. border 颜色不随亮/暗模式切换
2. `focus-visible:outline-none` 和 ring 样式不生效

## 根本原因

1. **tailwind.config.js 的 theme 为空**：缺少 Tailwind 颜色类到 CSS 变量的映射
2. **CSS 硬编码冲突**：`border-color: #eee` 和 `outline: none` 覆盖了 shadcn 样式

## 解决方案

### 1. tailwind.config.js 配置

添加完整的颜色映射（`tailwind.config.js`）：

```javascript
theme: {
  extend: {
    colors: {
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      'ring-offset': 'hsl(var(--background))', // 关键：ring offset 背景色
      primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
      secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
      destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
      accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
      card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
}
```

### 2. index.css 修复

**错误做法**（不生效）：
```css
@layer base {
  * {
    @apply border-border;  /* ❌ @apply 不能使用变量类名 */
    outline: none;         /* ❌ 干扰 focus-visible */
  }
}
```

**正确做法**：
```css
@layer base {
  * {
    border-color: hsl(var(--border));  /* ✅ 直接使用 CSS 变量 */
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

### 3. --ring 颜色调整

调整 `--ring` 值使其更明显：

```css
:root {
  --ring: 222.2 47.4% 11.2%;  /* 亮色：深蓝色 */
}

.dark {
  --ring: 216 34% 17%;  /* 暗色：浅蓝色 */
}
```

## 验证

组件的 focus-visible 样式现在正常工作：
```css
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

## 注意事项

1. **@apply 指令限制**：不能直接使用像 `border-border` 这样的 Tailwind 变量类
2. **全局 outline: none**：会干扰 focus-visible 的 ring 效果，应移除
3. **ring-offset 颜色**：必须配置为 `--background`，否则 ring 效果不完整

## 适用场景

- 所有使用 shadcn/ui + Tailwind CSS 的项目
- 需要自定义主题颜色的场景
- focus-visible 可访问性需求

