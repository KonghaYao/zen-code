# Chat + Config 融合设计：Config Drawer

**日期**: 2026-03-01  
**状态**: ✅ 已实现（2026-03-06 验证 - ConfigDrawer 组件已完整实现）  
**目标**: 将 zen-swarm 的 Chat 面板与 Config 面板融合，消除频繁切换的体验割裂感

---

## 背景与问题

当前 `ChatView` 和 `ConfigView`
是两个完全独立的页面，用户通过 Dock 切换。在 Chat 过程中需要调整 Agent、Model 或 MCP 配置时，必须离开当前对话页面，体验割裂。

**核心需求**：

- 减少操作步骤，Chat 时快速访问常用配置
- 简化 UI，降低学习成本
- 仅做 UI 层融合，行为逻辑（对话流程）不变

---

## 设计方案

### 整体布局：三栏结构

```
┌──────────────────────────────────────────────────────────────────┐
│  AppWindow (ChatView)                                             │
│                                                                   │
│  ┌──────────┬───────────────────────────────┬─────────────────┐  │
│  │ History  │         ChatPanel             │  Config Drawer  │  │
│  │ Sidebar  │                               │  (可折叠)       │  │
│  │ (不变)   │  [🤖 default · 🧠 gpt-4o ⚙️]│                 │  │
│  │          │  ─────────────────────────── │  ▸ 🤖 Agents    │  │
│  │          │  消息流...                    │  ▸ 🧠 Models    │  │
│  │          │                               │  ▸ 🔗 MCP      │  │
│  │          │  ─────────────────────────── │  ▸ 📝 Prompts   │  │
│  │          │  [Input]               [Stop] │  ▸ 🔑 API Keys  │  │
│  └──────────┴───────────────────────────────┴─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**关键设计决策**：

1. Config Drawer 默认**折叠**，点击 `⚙️` 按钮展开（`w-0 → w-72` 动画）
2. Config 内容**懒加载**：Drawer 未打开时不挂载、不加载数据
3. ChatPanel Header 常驻显示当前 Agent 名称和 Model 名称（只读状态徽章）
4. 行为逻辑不变：修改配置不会影响当前对话，不触发新会话

---

## 常驻状态徽章（ChatPanel Header）

Chat Header 改造前后对比：

```
改造前: [Chat 标题] ───────────── [AgentSelect ▾] [Stop]

改造后: [Chat] [🤖 default] [🧠 gpt-4o] ─── [⚙️] [Stop]
```

- `🤖 default`：当前 Agent 名称，**只读徽章**，点击打开 Drawer 并跳到 Agent 分区
- `🧠 gpt-4o`：当前 Model 名称，**只读徽章**，点击打开 Drawer 并跳到 Model 分区
- `⚙️`：展开/收起 Config Drawer 的切换按钮

---

## Config Drawer 内容

Drawer 宽度约 `280px`（`w-72`），内容分 5 个分区（竖向手风琴 Accordion 或 Tab）：

| 分区        | 图标 | 内容                                 | 数据来源                     |
| ----------- | ---- | ------------------------------------ | ---------------------------- |
| Agents      | 🤖   | Agent 列表，点击切换当前对话的 Agent | `useAgentsStore`             |
| Models      | 🧠   | Model 列表，切换当前使用的模型       | `useModelsStore`             |
| MCP Servers | 🔗   | MCP Server 开关列表                  | `useMcpStore`                |
| Prompts     | 📝   | 当前 Agent 的 Prompt 查看/简单编辑   | `usePromptsStore`            |
| API Keys    | 🔑   | Provider / API Key 简化入口          | 链接到独立配置或内嵌简化表单 |

---

## 组件拆解

### 新建组件

**`ConfigDrawer.tsx`**（路径：`zen-swarm/src/frontend/components/ConfigDrawer.tsx`）

```tsx
// 懒加载：open=false 时不渲染，open=true 时挂载并加载数据
interface ConfigDrawerProps {
    open: boolean;
    onClose: () => void;
    initialSection?: 'agents' | 'models' | 'mcp' | 'prompts' | 'apikeys';
}

export function ConfigDrawer({ open, onClose, initialSection }: ConfigDrawerProps) {
    if (!open) return null; // 懒加载：不渲染

    return (
        <aside className="w-72 flex-shrink-0 border-l border-border-subtle bg-white overflow-y-auto">
            {/* 手风琴 / Tab 内容 */}
        </aside>
    );
}
```

### 改造现有组件

**`ChatPanel.tsx`** — Header 区域

- 新增 `onOpenConfig?: (section?: string) => void` prop
- Header 添加 Agent 徽章、Model 徽章、`⚙️` 按钮
- 移除原有 `AgentSelect` 下拉（改为 Drawer 内管理）

**`ChatView.tsx`** — 布局改造

```tsx
// 新增状态
const [drawerOpen, setDrawerOpen] = useState(false);
const [drawerSection, setDrawerSection] = useState<string | undefined>(undefined);

// 布局：三栏
<div className="flex h-full overflow-hidden">
  <HistoryGroupedSidebar ... />
  <div className="flex-1 min-w-0">
    <ChatPanel
      ...
      onOpenConfig={(section) => {
        setDrawerSection(section);
        setDrawerOpen(true);
      }}
    />
  </div>
  <ConfigDrawer
    open={drawerOpen}
    onClose={() => setDrawerOpen(false)}
    initialSection={drawerSection}
  />
</div>
```

---

## 实施路径

### Phase 1 — 核心 UI 骨架

1. 改造 `ChatPanel` Header：添加 Agent/Model 只读徽章 + `⚙️` 按钮
2. 创建 `ConfigDrawer` 组件骨架（折叠/展开动画，`w-0 ↔ w-72`）
3. 改造 `ChatView` 布局为三栏结构

### Phase 2 — Drawer 内容填充

4. Agent 切换分区（复用 `useAgentsStore`）
5. Model 切换分区（复用 `useModelsStore`）
6. MCP Server 开关分区（复用 `useMcpStore`）

### Phase 3 — 进阶内容

7. Prompt 查看/编辑分区（复用 `usePromptsStore`）
8. API Keys 简化入口（链接到外部配置或内嵌表单）

---

## 受影响的文件

| 文件                                                 | 变更类型                         |
| ---------------------------------------------------- | -------------------------------- |
| `zen-swarm/src/frontend/views/ChatView.tsx`          | 改造：三栏布局 + Drawer 状态管理 |
| `zen-swarm/src/frontend/components/ChatPanel.tsx`    | 改造：Header 区域添加徽章和按钮  |
| `zen-swarm/src/frontend/components/ConfigDrawer.tsx` | 新建：懒加载配置抽屉             |
| `zen-swarm/src/frontend/views/ConfigView.tsx`        | 不变：独立 Config 页面保留       |

---

## 技术约束

- **懒加载**：`ConfigDrawer` 在 `open=false` 时返回 `null`，不挂载 DOM，不触发数据请求
- **动画**：使用 `motion/react`（项目已有依赖），`w-0 → w-72` 宽度过渡
- **状态隔离**：Drawer 内的配置变更不影响当前对话（仅 UI 融合，逻辑不变）
- **数据复用**：优先复用 `ConfigView` 已有的 Store 和 Form 组件，避免重复造轮子

---

## 验收标准

- [ ] Chat 页面 Header 常驻显示当前 Agent 和 Model 名称
- [ ] 点击 `⚙️` 按钮，右侧 Config Drawer 从折叠滑出展开
- [ ] 再次点击 `⚙️`，Drawer 收起，Chat 区域恢复全宽
- [ ] Drawer 未打开时，不发起任何配置数据请求
- [ ] 点击 Agent 徽章，打开 Drawer 并自动展开 Agents 分区
- [ ] 点击 Model 徽章，打开 Drawer 并自动展开 Models 分区
- [ ] Drawer 内切换 Agent/Model 不影响当前对话（行为不变）
- [ ] 布局在不同窗口尺寸下正常显示（最小宽度兼容）
