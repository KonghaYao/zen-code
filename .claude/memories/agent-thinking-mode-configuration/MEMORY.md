---
name: "agent-thinking-mode-configuration"
description: "在 code-graph 项目中添加 enable_thinking 参数来控制 AI 模型的思考模式（Claude Thinking）。实现涉及后端状态定义、模型初始化、图节点调用以及 TUI 前端配置系统的完整修改链路。适用于需要动态控制模型思考模式的场景，支持 Anthropic 和 OpenAI 两种提供商。"
tags: ["langgraph", "thinking-mode", "configuration", "tui", "anthropic"]
category: "configuration"
created: "2025-01-13"
last_updated: "2025-01-13"
priority: "medium"
context_scope: "project"
---

# ## 背景

## 背景

用户需要添加一个参数来控制 agent 端的思考模式（Claude Thinking），允许用户启用或禁用模型的扩展思考功能。

## 实现方案

### 1. 后端状态定义

在 `agents/code/state.ts` 中添加 `enable_thinking` 字段：

```typescript
export const CodeState = AgentState.extend(SubAgentStateSchema.shape).extend({
    // ... 其他字段
    enable_thinking: z.boolean().default(true),
});

export const CodeAnnotation = createState(MessagesAnnotation, SubAgentAnnotation).build({
    // ... 其他字段
    enable_thinking: createDefaultAnnotation(() => true),
});
```

### 2. 模型初始化逻辑

在 `agents/code/initChatModel.ts` 中添加 `enableThinking` 参数处理：

参见 `agents/code/initChatModel.ts:1-30`：

```typescript
interface InitChatModelOptions {
    modelProvider?: string;
    streamUsage?: boolean;
    enableThinking?: boolean;
}

export const initChatModel = async (
    mainModel: string,
    options: InitChatModelOptions = {}
) => {
    const { modelProvider, streamUsage = true, enableThinking = true } = options;
    let model;

    if (modelProvider === 'anthropic') {
        model = new ChatAnthropic({
            // ...
            thinking: enableThinking ? {
                budget_tokens: 1024,
                type: 'enabled',
            } : undefined,
        });
    } else {
        model = new ChatOpenAI({
            // ...
            modelKwargs: enableThinking ? {
                thinking: {
                    type: 'enabled',
                },
            } : undefined,
        });
    }

    return model;
};
```

**关键差异**：
- Anthropic: 使用 `thinking` 配置项，支持 `budget_tokens`
- OpenAI: 使用 `modelKwargs.thinking` 配置项
- 禁用时设置为 `undefined`（OpenAI）或不传递（Anthropic）

### 3. 图节点调用

在 `agents/code/graph.ts` 的三处 `initChatModel` 调用中传递参数：

参见 `agents/code/graph.ts:30-80`（switchBranch 和 graph 节点）：

```typescript
const model = await initChatModel(state.main_model, {
    modelProvider: process.env.MODEL_PROVIDER || 'openai',
    streamUsage: true,
    enableThinking: state.enable_thinking ?? true,
});
```

### 4. TUI 前端配置

#### 4.1 配置存储

在 `tui/src/chat/store/index.ts` 的 `AppConfig` 接口添加字段：

```typescript
export interface AppConfig {
    // ... 其他字段
    enable_thinking?: boolean;
}
```

#### 4.2 命令支持

在 `tui/src/chat/commands/extended.ts` 的 `/config` 命令中添加支持：

参见 `tui/src/chat/commands/extended.ts:180-220`：

```typescript
// 添加到 validKeys 数组
const validKeys = [
    'enable_thinking',
    // ... 其他键
];

// 布尔值转换逻辑
let value: any = args.slice(1).join(' ');
if (key === 'enable_thinking') {
    if (value === 'true' || value === '1' || value === 'yes') {
        value = true;
    } else if (value === 'false' || value === '0' || value === 'no') {
        value = false;
    }
}
```

#### 4.3 参数传递

在 `tui/src/chat/context/SettingsContext.tsx` 的 `extraParams` 中包含参数：

```typescript
const extraParams = useMemo(() => {
    return {
        main_model: config?.main_model || AVAILABLE_MODELS[0]?.id,
        cwd: process.cwd(),
        mcp_config: config?.mcp_config,
        enable_thinking: config?.enable_thinking ?? true,
    };
}, [config, AVAILABLE_MODELS]);
```

## 使用方式

```bash
/config enable_thinking false   # 关闭思考模式
/config enable_thinking true    # 开启思考模式（默认）
/config                         # 查看当前配置
```

配置保存在 `~/.code-graph.json`，重启程序或使用 `/init` 创建新会话后生效。

## 技术要点

1. **状态传播链**: AppState → extraParams → graph state → initChatModel → model config
2. **默认值策略**: 使用 `?? true` 确保未配置时启用思考模式
3. **布尔值处理**: 支持多种输入格式（true/false、1/0、yes/no）
4. **提供商差异**: Anthropic 和 OpenAI 的 thinking 配置方式不同，需分别处理

## 适用场景

- 需要控制模型思考模式以平衡响应质量和速度
- 不同任务对思考模式有不同需求
- 调试或测试时需要快速切换模式
