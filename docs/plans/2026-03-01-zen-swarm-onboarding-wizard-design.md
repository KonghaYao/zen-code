# Zen Swarm 新用户初始化向导设计文档

**日期**: 2026-03-01 **状态**: 已批准，待实现

---

## 背景

新用户首次打开 zen-swarm 时，需要完成 Provider 和 Models 的配置才能使用 AI 功能。目前系统没有引导流程，用户需要自行找到 Config 面板进行配置，体验不佳。

本方案设计一个新用户初始化向导，在检测到无 Provider 时自动触发，引导用户完成必要配置。

---

## 方案选择

采用**方案 A：路由级全屏页**。在 HashRouter 中新增 `/setup` 路由，通过 `useProviders()`
检测触发自动跳转。此方案逻辑清晰，完全隔离，与现有路由架构一致。

---

## 文件结构

```
zen-swarm/src/frontend/
├── views/
│   └── SetupWizard/
│       ├── index.tsx          # 主 Wizard 状态机（step: 1-4）
│       ├── StepWelcome.tsx    # Step 1：欢迎页
│       ├── StepProvider.tsx   # Step 2：Provider 配置
│       ├── StepModels.tsx     # Step 3：模型选择
│       └── StepComplete.tsx   # Step 4：完成
├── App.tsx                    # 修改：添加 /setup 路由
└── layouts/
    └── DockLayout.tsx         # 修改：添加 useProviders 检测 + 重定向逻辑
```

---

## 触发逻辑

```
用户访问 zen-swarm
  └── DockLayout 挂载
        └── useProviders() 查询
              ├── loading → 显示加载状态（不重定向）
              ├── providers.length > 0 → 正常进入应用
              └── providers.length === 0 → navigate('#/setup')
```

`#/setup` 路由渲染 `SetupWizard` 全屏组件，不含 Dock 和 MenuBar。

---

## 各步骤设计

### Step 1 — 欢迎页（StepWelcome）

- 居中展示产品 Logo 和名称 "Zen Swarm"
- 副标题："在开始之前，让我们配置你的 AI 提供商"
- "开始配置" 按钮 → 进入 Step 2

### Step 2 — Provider 配置（StepProvider）

复用 `ProviderForm` 组件逻辑，字段：

- Provider 名称（文本输入）
- Provider 类型（OpenAI / Anthropic 下拉选择）
- API Key（密码输入框，带显示/隐藏切换）
- Base URL（自动填充默认值，可修改）
- `isActive` 默认勾选

提交：调用 `useCreateProvider()` mutation，成功后保存 `providerId` 和 `providerType`，进入 Step 3。

### Step 3 — 模型选择（StepModels）

根据 Step 2 的 `providerType` 展示预设模型卡片列表：

**OpenAI**:

- `gpt-4o` / GPT-4o
- `gpt-4o-mini` / GPT-4o Mini
- `o1` / O1

**Anthropic**:

- `claude-opus-4-5-20251101` / Claude Opus 4.5
- `claude-sonnet-4-5-20250929` / Claude Sonnet 4.5
- `claude-3-5-haiku-20241022` / Claude 3.5 Haiku

用户至少勾选一个（默认勾选第一个），提交时批量调用 `models.createMany()` API，成功后进入 Step 4。

### Step 4 — 完成（StepComplete）

- 显示已创建的 Provider 名称和模型数量
- 告知已有默认 Agent "Jarvis" 可用
- "开始使用" 按钮 → `navigate('#/chat')`

---

## 数据流

```typescript
// Wizard 本地状态
interface WizardData {
    providerId: string; // Step 2 完成后保存
    providerType: ProviderType;
}

// Step 2 API 调用
useCreateProvider()
    .mutate({
        name,
        type,
        apiKey,
        baseUrl,
        isActive: true,
    })
    (
        // Step 3 API 调用
        apiClient as any,
    )
    .models.createMany.mutate(
        selectedModels.map((m) => ({
            id: m.id,
            name: m.name,
            provider_id: providerId,
            model_name: m.id,
        })),
    );
```

---

## UI 设计

- **背景**: 复用 `DesktopWallpaper` 组件（视觉一致性）
- **卡片**: 白色大卡片，`max-w-2xl`，居中
- **进度条**: 顶部步骤指示器（Step 1/4 → 2/4 → 3/4 → 4/4）
- **不可关闭**: Wizard 无关闭按钮，强制完成配置才能进入主界面
- **错误处理**: 各 Step 内显示内联错误提示，不跳转

---

## 实现注意点

1. DockLayout 的 `useProviders` 检测需等待 query 完成后再决定是否重定向（避免 loading 时误跳转）
2. `#/setup` 路由需要在 App.tsx 中在 `*` 路由之前声明，优先匹配
3. SetupWizard 完成后 `navigate('#/chat')` 并调用 `queryClient.invalidateQueries`
   刷新 providers 缓存，避免 DockLayout 再次重定向
