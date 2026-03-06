# TUI 安装引导流程 Spec

> **状态**: ✅ 已实现（2026-03-06 验证 - `SetupWizard` 组件已在 `zen-code/src/chat/components/setup/` 实现）

## 概述

通过 `zen-init` 独立命令触发安装引导流程，收集用户配置后写入 `~/.code-graph.json`，完成后提示用户重启应用。

---

## 触发方式

```bash
zen-init
```

**独立 CLI 入口**: `tui/src/zen-init.ts`

---

## 流程设计

### 状态机

```
[Start] → [Welcome] → [ProviderSelect] → [APIAndBaseURL] → [ModelSelect] → [Complete] → [Exit]
              ↓                                                                               ↑
           [Ctrl+C] ←───────────────────────────────────────────────────────────────────────────┘
```

### 状态定义

| 状态            | 组件              | 说明                                 |
| --------------- | ----------------- | ------------------------------------ |
| `welcome`       | WelcomeStep       | 欢迎页，介绍项目功能                 |
| `provider`      | ProviderStep      | 选择 AI 提供商                       |
| `apiAndBaseUrl` | APIAndBaseURLStep | 同时输入 API Key 和 Base URL（可选） |
| `model`         | ModelStep         | 选择模型                             |
| `complete`      | CompleteStep      | 保存配置并退出                       |

---

## 组件规范

### 1. SetupWizard

**路径**: `tui/src/setup/SetupWizard.tsx`

```tsx
interface SetupWizardProps {
    // 无需 props，独立运行
}

interface SetupState {
    step: 'welcome' | 'provider' | 'apiAndBaseUrl' | 'model' | 'complete';
    provider: 'openai' | 'anthropic' | null;
    apiKey: string;
    baseUrl: string;
    selectedModel: string;
}
```

**职责**:

- 管理引导流程状态
- 处理步骤切换和验证
- 收集配置数据
- 调用 `store.updateConfig()` 保存
- 保存成功后调用 `process.exit(0)`

### 2. WelcomeStep

**路径**: `tui/src/setup/steps/WelcomeStep.tsx`

```
┌─────────────────────────────────────┐
│                                     │
│   ⚡ Zen Code Setup                 │
│   AI 驱动的命令行编程助手            │
│                                     │
│   本引导将配置:                     │
│   • AI 提供商                       │
│   • API Key                         │
│   • 默认模型                        │
│                                     │
│   [Enter 开始] [Ctrl+C 退出]        │
│                                     │
└─────────────────────────────────────┘
```

### 3. ProviderStep

**路径**: `tui/src/setup/steps/ProviderStep.tsx`

```
┌─────────────────────────────────────┐
│  选择 AI 提供商                      │
├─────────────────────────────────────┤
│  ○ OpenAI (GPT-4, o1)              │
│  ○ Anthropic (Claude)               │
│                                     │
│  ↑↓ 选择  Enter 确认  Ctrl+C 退出    │
└─────────────────────────────────────┘
```

### 4. APIAndBaseURLStep

**路径**: `tui/src/setup/steps/APIAndBaseURLStep.tsx`

```
┌─────────────────────────────────────┐
│  ▼ API Key                          │
│  https://platform.openai.com/api-keys │
│  > sk-****************************   │
│                                     │
│    Base URL (可选)                  │
│  默认: https://api.openai.com/v1    │
│  >                                  │
│                                     │
│  Enter 确认  ↑↓ 切换  Ctrl+C 退出    │
└─────────────────────────────────────┘
```

**功能**:

- 两个输入框同时显示
- 第一个输入框（API Key）默认获得焦点
- 方向键 ↑/↓ 在两个输入框间切换
- API Key 输入完成后自动跳转到 Base URL
- Base URL 输入完成后进入下一步
- 在 API Key 字段按退格键且为空时返回上一步

**验证**:

- OpenAI: `^sk-`
- Anthropic: `^sk-ant-`

**环境变量设置**: 验证通过后设置以下环境变量供后续步骤使用：

- `MODEL_PROVIDER` - 当前选择的提供商
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - API Key
- `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` - 自定义 Base URL（如果与默认值不同）

### 5. ModelStep

**路径**: `tui/src/setup/steps/ModelStep.tsx`

```
┌─────────────────────────────────────┐
│  选择模型                             │
├─────────────────────────────────────┤
│  检测可用模型中...                    │
│                                     │
│  ○ gpt-4o                          │
│  ○ gpt-4o-mini                     │
│  ○ o1-preview                      │
│                                     │
│  ↑↓ 选择  Enter 确认  R 刷新         │
└─────────────────────────────────────┘
```

**API 调用**: 复用 `get_allowed_models()`

### 6. CompleteStep

**路径**: `tui/src/setup/steps/CompleteStep.tsx`

```
┌─────────────────────────────────────┐
│  配置完成                             │
├─────────────────────────────────────┤
│  提供商: OpenAI                      │
│  模型: gpt-4o                        │
│                                     │
│  ✓ 已保存到 ~/.code-graph.json       │
│                                     │
│  请运行 'bun run dev' 启动应用        │
│                                     │
│  [任意键退出]                        │
└─────────────────────────────────────┘
```

**行为**:

- 调用 `store.updateConfig()` 保存配置
- 显示成功消息
- 用户按任意键后 `process.exit(0)`

---

## 配置存储

**调用方式**: 使用 `tui/src/chat/store/index.ts` 的统一接口

```typescript
import { updateConfig } from '../chat/store/index';

await updateConfig({
    main_model: 'gpt-4o',
    model_provider: 'openai',
    openai_api_key: 'sk-...',
    openai_base_url: 'https://api.openai.com/v1',
});
```

**保存位置**: `~/.code-graph.json`

```json
{
    "main_model": "gpt-4o",
    "model_provider": "openai",
    "openai_api_key": "sk-...",
    "openai_base_url": "https://api.openai.com/v1",
    "stream_refresh_interval": 100
}
```

---

## CLI 入口

### 文件结构

```
tui/src/
├── zen-init.ts              # 独立的 setup 命令入口
└── setup/
    ├── SetupWizard.tsx      # 主组件
    ├── steps/
    │   ├── WelcomeStep.tsx
    │   ├── ProviderStep.tsx
    │   ├── APIAndBaseURLStep.tsx
    │   ├── ModelStep.tsx
    │   └── CompleteStep.tsx
    └── types.ts
```

### zen-init.ts

```typescript
#!/usr/bin/env bun
import { render } from 'ink';
import { SetupWizard } from './setup/SetupWizard';
import { initDb } from './chat/store/index';

async function main() {
    await initDb();
    render(<SetupWizard />);
}

main();
```

### package.json bin 配置

```json
{
    "bin": {
        "zen-init": "./dist/zen-init.js"
    }
}
```

---

## 错误处理

| 场景             | 处理方式                    |
| ---------------- | --------------------------- |
| API Key 无效     | 显示错误，允许重新输入      |
| 模型列表获取失败 | 显示错误，允许重试或跳过    |
| 配置保存失败     | 显示错误，提供手动配置指引  |
| 用户中途退出     | Ctrl+C 直接退出，不保存配置 |

---

## 设计原则

1. **完全解耦**: `zen-init` 与 `app.tsx` 完全分离，独立文件
2. **独立命令**: 通过 `zen-init` 启动，不依赖 commander
3. **统一存储**: 使用 `store.updateConfig()` 和 `store.initDb()`
4. **零依赖**: 使用现有 Ink 组件，不引入新依赖
5. **视觉一致**: 遵循现有 TUI 风格（颜色、布局）
