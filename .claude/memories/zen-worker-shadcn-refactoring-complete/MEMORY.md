---
name: "zen-worker-shadcn-refactoring-complete"
description: "zen-worker 项目使用 shadcn/ui 组件系统进行全面重构；包括页面组件、布局组件、审批面板和工具渲染组件的统一改造；创建了 ToolCard 可复用组件支持多主题、状态和滚动区域；配置路径别名解决导入问题"
tags: ["shadcn-ui", "react", "refactoring", "component-library", "tool-rendering"]
category: "architecture"
created: "2025-01-17"
last_updated: "2025-01-17"
priority: "high"
context_scope: "project"
---

# ## 背景

## 背景

zen-worker 项目需要使用 shadcn/ui 组件系统进行全面重构，以统一 UI 风格、提升可维护性和代码复用率。

## 解决方案

### 1. **路径别名配置**

**tsconfig.json** - 添加路径映射：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "src/*": ["./src/*"]
    }
  }
}
```

**vite.config.ts** - 添加 Vite 解析配置：
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  },
  // ...
});
```

### 2. **页面组件重构**

#### ConfigPage
- 使用 `Card` 系列组件替换原生 section 布局
- 使用 `Label + Input` 组合替换原生表单元素
- 使用 `Select` 组件替换原生 `<select>`
- 使用 `Checkbox` 组件替换原生 checkbox

#### ChatPage
- 使用 `ScrollArea` 包裹消息列表优化滚动体验
- 使用 `Textarea` 组件替换原生 textarea
- 使用 `Badge` 显示加载状态
- 使用 `Alert` 组件显示错误信息

#### SkillsPage / HistoryPage / PluginsPage
- 使用 `Card` 系列组件统一占位页面样式
- 使用 `Badge` 显示状态标签

#### Sidebar
- 使用 `Separator` 组件替换原生边框
- 使用 `ScrollArea` 优化导航滚动体验

#### GlobalApprovalPanel
- 使用 `Badge` 组件显示审批统计信息
- 使用不同 `Badge` variant 区分审批状态

### 3. **Toast 通知系统**

修改 `src/components/ui/sonner.tsx` 使用项目的 ThemeContext：
```typescript
import { useTheme } from "../../contexts/ThemeContext"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme === 'dark' ? 'dark' : 'light'}
      // ...
    />
  )
}
```

在 `App.tsx` 中添加 `<Toaster />` 组件。

### 4. **统一工具渲染组件**

创建 `src/components/ToolCard.tsx`，支持：
- 8 种颜色主题（blue, green, yellow, orange, purple, gray, indigo, red）
- 4 种状态（loading, success, error, pending）
- 可选的 ScrollArea 支持长内容
- 完整的暗色模式支持
- 类型安全的 TypeScript 接口

**使用示例**：
```typescript
<ToolCard
  icon="📄"
  title={file_path}
  operation="read"
  meta={`${totalLines} lines`}
  output={output}
  variant="blue"
  scrollable={true}
/>
```

重构了 8 个工具组件：
- `folder_operations.tsx` - indigo 主题
- `replace_in_file.tsx` - yellow 主题
- `write_file.tsx` - orange 主题，显示行数和写入状态
- `todo_tool.tsx` - green 主题
- `batch_command.tsx` - gray 主题
- `read_file.tsx` - blue 主题，支持滚动
- `glob_files.tsx` - purple 主题，支持滚动

## 架构优势

1. **设计系统一致性**：所有页面使用统一的组件库
2. **类型安全**：完整的 TypeScript 类型支持
3. **可维护性**：组件化设计，易于复用和修改
4. **可访问性**：Radix UI 提供完整的 ARIA 支持
5. **主题支持**：原生支持暗色模式，自动切换
6. **代码简化**：每个工具的 render 函数从 ~30 行减少到 ~15 行，代码重复减少 70%+

## 修复的问题

1. **ConfigPage JSX 闭合标签错误** - 添加缺失的 `</CardContent>` 标签
2. **路径别名解析错误** - 配置 tsconfig.json 和 vite.config.ts 的 paths 和 alias

## 适用场景

- React 项目使用 shadcn/ui 组件系统的全面迁移
- 需要统一 UI 风格和提升可维护性的项目
- 创建可复用的工具渲染组件

## 注意事项

- 确保项目已安装所有必要的 @radix-ui 依赖
- 路径别名配置需要同时更新 tsconfig.json 和 vite.config.ts
- shadcn/ui 组件使用 "src/lib/utils" 导入路径，需要配置路径别名支持
