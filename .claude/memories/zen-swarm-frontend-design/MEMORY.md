---
name: zen-swarm-frontend-design
description:
    zen-swarm 前端完整设计系统：五套设计风格（Cyberpunk、Minimal、Organic/Natural、Bold/Editorial、Ultra
    Bold）、布局修复（左右分栏、Modal状态管理、表单颜色统一）、Bun
    Select组件修复（自定义实现、字段映射、外键约束）、全局CSS变量系统。遵循 frontend-design
    技能原则：大胆美学、独特性、避免通用 AI 设计
tags:
    - frontend-design
    - css-system
    - react-styling
    - aesthetic-variants
    - layout-fix
    - zen-swarm
    - bun-select
    - field-mapping
category: architecture
created: 2025-01-17
last_updated: 2025-02-19
priority: high
context_scope: project
---

# zen-swarm 前端设计系统

## 一、五套设计风格

### 设计对比

| 特性     | Cyberpunk       | Minimal      | Organic/Natural | Bold/Editorial      | Ultra Bold       |
| -------- | --------------- | ------------ | --------------- | ------------------- | ---------------- |
| 主色调   | 深色            | 浅色         | 温暖浅色        | 高对比度浅色        | 超高对比度黑白   |
| 品牌色   | 霓虹（青/洋红） | 蓝色 #3b82f6 | 赤陶色 #d4765c  | 电光靛蓝 #4f46e5    | 蓝色 #2563eb     |
| 边界半径 | 中等            | 0.25-1rem    | 0.5-2rem        | 0.125-0.75rem       | 无圆角 0         |
| 阴影     | 冷霓虹色        | 中性         | 温暖琥珀色      | 清晰锐利            | 硬阴影（无模糊） |
| 动画     | 强烈            | 柔和         | 自然弹性        | 快速（120ms）       | 极速（100ms）    |
| 字体     | 等宽+罗马       | Inter        | Nunito          | Space Grotesk+Inter | Oswald+Inter     |
| 间距     | 宽松            | 标准         | 宽松            | 紧凑                | 紧凑夸张         |
| 边框     | 细              | 1px          | 1-2px           | 2px                 | 4px              |
| 氛围     | 未来科技        | 专业极简     | 友好舒适        | 大胆编辑            | 杂志海报         |

### Minimal 浅色主题配色

```css
/* 中性色板 */
--color-neutral-50: #fafafa; /* 主背景 */
--color-neutral-200: #e5e5e5; /* 边框 subtle */
--color-neutral-300: #d4d4d4; /* 边框默认 */
--color-neutral-900: #171717; /* primary text */

/* 品牌色 */
--color-primary: #3b82f6;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
```

---

## 二、布局修复

### 左右分栏布局

```tsx
// 外层容器：固定高度，防止内容超出
className = 'flex gap-6 h-[calc(100vh-8rem)] overflow-hidden';

// 左侧导航：固定宽度，可滚动
className = 'w-64 flex flex-col gap-2';

// 右侧内容：占据剩余空间，垂直滚动
className = 'flex-1 overflow-y-auto';
```

### Modal 状态管理

```tsx
interface ModalState {
    showCreateModal: boolean;
    editingItem: T | null;
    showDeleteModal: boolean;
}

// 事件处理
const handleOpenCreateModal = () => setShowCreateModal(true);
const handleEditItem = (item: T) => {
    setEditingItem(item);
    setShowCreateModal(true);
};
```

### 表单颜色统一

| 元素   | 样式                                         |
| ------ | -------------------------------------------- |
| 背景   | `bg-white`                                   |
| 边框   | `border-gray-200`                            |
| 文字   | `text-gray-900`                              |
| 占位符 | `placeholder-gray-400`                       |
| 禁用   | `disabled:bg-gray-50 disabled:text-gray-400` |

### 卡片溢出处理

```tsx
// 容器：防止内容溢出
className = 'overflow-hidden min-w-0';

// 文本：截断并显示 tooltip
className = 'truncate';
title = { fullText };
```

---

## 三、Bun Select 组件修复

### 问题

Bun 环境下原生 `<select>` 的 `e.currentTarget` 为 null，导致 Runtime Error。

### 解决方案：自定义 Select 组件

```tsx
interface SelectProps<T> {
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string }[];
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
}

// 支持键盘导航：ArrowUp/ArrowDown/Enter/Space/Escape
// 点击外部自动关闭
// 支持禁用和 loading 状态
```

### 数据库字段映射转换

```typescript
// 提交时转换
const submitData = {
    model_id: formData.model, // model → model_id
    system_prompt_id: formData.system_prompt, // system_prompt → system_prompt_id
};

// 编辑回显时转换
formData.model = agent.model_id || agent.model;
formData.system_prompt = agent.system_prompt_id || agent.systemPromptId;
```

### 外键约束处理

```typescript
// 提交前验证非空
if (!formData.model || !formData.system_prompt) {
    alert('请填写所有必填字段');
    return;
}

// 跳过空键
const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== ''),
);
```

### Zod Schema 分离

```typescript
const baseAgentSchema = z.object({
    name: z.string().min(1, '名称不能为空'),
    model_id: z.string().min(1, '请选择模型'),
    system_prompt_id: z.string().min(1, '请选择系统提示词'),
});

const agentSchema = baseAgentSchema.refine((data) => data.name.length <= 100, {
    message: '名称长度不能超过100字符',
    path: ['name'],
});
```

---

## 四、MCP Server 数据结构修复

```typescript
// 新类型（正确）
interface MCPServer {
    id: string;
    name: string;
    config: Record<string, any>; // 所有配置都在这里
    enabled: boolean;
}

// ID = Name 简化
const data = {
    id: id,
    name: id, // 直接使用 id
    config: config, // config 中不包含 name
};
```

---

## 五、适用场景

| 风格            | 适用场景                         |
| --------------- | -------------------------------- |
| Minimal         | 企业级应用、专业工具             |
| Cyberpunk       | 创意工具、娱乐应用               |
| Organic/Natural | 社交应用、长时间使用的界面       |
| Bold/Editorial  | 编辑工具、数据分析、现代科技产品 |
| Ultra Bold      | 杂志/海报风格、创意作品集        |

---

## 相关文件

### 全局样式

- `src/frontend/global.css` - CSS 变量系统
- `src/frontend/layouts/MainLayout.tsx` - 主布局

### 布局视图

- `src/frontend/views/AgentConfigView.tsx` - Agent 配置视图
- `src/frontend/views/ResourcesView.tsx` - 资源管理视图

### 表单组件

- `src/frontend/components/ui/Select.tsx` - 自定义 Select 组件
- `src/frontend/components/panels/*/Form.tsx` - 各面板表单

### 卡片组件

- `src/frontend/components/panels/*/Card.tsx` - 各面板卡片
