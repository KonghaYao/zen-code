---
name: 'workflow-practices'
description:
    '工作流程最佳实践：命令系统设计模式、文档编写规范、记忆命名规范。涵盖 /plan 模式前缀声明设计、humanizer
    文档风格、YAML 格式化安全处理、kebab-case 命名约定等。'
tags:
    - workflow
    - command-system
    - documentation
    - naming-convention
    - yaml-formatting
    - humanizer-style
category: 'workflow'
created: '2025-01-17'
last_updated: '2025-02-17'
priority: 'medium'
context_scope: 'project'
---

# 工作流程最佳实践

## 一、命令系统设计模式

### /plan 模式：前缀声明 + 流程化

**核心设计**：使用 PREFIX 定义角色和流程，而非硬编码逻辑。

```typescript
const MEMORY_PREFIX = `
[Memory Organization Mode Activated]

I want to organize and manage the .claude/memories folder.

**Your Role:** You are in Memory Organization Mode - analyze, organize, and maintain the project memory files...

**Process:**
1. Read all memory files...
2. Analyze the structure and identify issues...
3. Propose and execute organization actions...
4. Generate a summary report...
`;

execute: async (args, context) => {
    const enhancedMessage = MEMORY_PREFIX + (userRequest || '开始整理记忆文件夹。');
    context.sendMessage([{ type: 'human', content: enhancedMessage }], { extraParams: context.extraParams });
};
```

**适用场景**：需要 AI 执行复杂流程的命令（`/plan`、`/memory-clear`、`/summary`）

### 参数合并模式

**问题**：调用者传入的 extraParams 被默认值覆盖。

**解决**：使用展开运算符合并，调用者参数优先。

```typescript
// CommandHandler.tsx
sendMessage(messages, options = {}) {
    return sendMessage(messages, {
        extraParams: { ...extraParams, ...options.extraParams },
        ...options,
        metadata: metadataOfChat,
    });
}
```

---

## 二、文档编写规范

### humanizer 风格原则

**目标**：去除 AI 痕迹，口语化、简洁、有观点。

| 避免                                                 | 改用                                       |
| ---------------------------------------------------- | ------------------------------------------ |
| "在 TUI 中查看"                                      | "在 TUI 里看"                              |
| "如果你只是让 AI 帮你写写代码、改改文件，可能不需要" | "写写代码、改改文件的话，默认工具就够用了" |
| "可能"、"应该"、"或者"                               | 直接陈述或省略                             |
| 中性报告风格                                         | 有观点、有态度                             |

**核心原则**：

- 短句，节奏自然
- 删除冗余内容（快捷键表格、过度说明）
- 基于代码实现验证，避免描述不存在的功能

### 文档结构规范

1. **快速使用优先**：先写怎么用，再写原理
2. **删除不支持的配置方式**：如环境变量配置
3. **保留快速唤出方式**：如 `#技能名`、`/命令`
4. **技术细节后置**：用户不需要手动改动的底层细节简述即可

---

## 三、记忆命名规范

### kebab-case 强制规范

**格式要求**：

- 仅包含小写字母、数字和单个连字符（-）
- 不能包含空格、下划线、中文或其他特殊字符
- 不能以连字符开头或结尾
- 不能有连续的连字符

**正则**：`/^[a-z0-9]+(-[a-z0-9]+)*$/`

**示例**：

- ✅ `memory-clear-command`
- ✅ `zen-code-user-guide`
- ❌ `Memory_Clear`
- ❌ `记忆管理`

### 名称规范化函数

```typescript
function normalizeMemoryName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // 移除中文和特殊字符
        .replace(/-+/g, '-') // 合并多个连字符
        .replace(/^-|-$/g, ''); // 移除首尾连字符
}
```

---

## 四、YAML Frontmatter 安全处理

### 问题：手动拼接导致转义错误

```typescript
// ❌ 危险：特殊字符未转义
const frontmatter = `---
name: ${name}
description: ${description}
---`;
```

### 解决：使用 yaml.stringify

```typescript
import * as yaml from 'yaml';

const frontmatterObj = {
    name: finalMemoryName,
    description: memory.description.replace(/\n/g, ' '),
    tags: memory.tags,
    category: memory.category,
    created: memory.created,
    last_updated: memory.last_updated,
    priority: memory.priority,
    context_scope: memory.context_scope,
};

const frontmatterYaml = yaml.stringify(frontmatterObj, {
    indent: 2,
    lineWidth: 0, // 不折行，避免描述被意外换行
});
```

**关键配置**：`lineWidth: 0` 防止描述字段被意外折行。

---

## 五、配置验证模式

### 启动时配置检查

**验证链**：

1. 配置文件存在性
2. providers 数组非空
3. provider_id 指向存在的 provider
4. 当前 provider 已配置 API Key

```typescript
function validateConfig(config: AppConfig | null): { needsSetup: boolean; reason?: string } {
    if (!config) return { needsSetup: true, reason: '未找到配置文件' };
    if (!config.providers?.length) return { needsSetup: true, reason: '未配置任何 Provider' };

    const currentProvider = config.providers.find((p) => p.id === config.provider_id);
    if (!currentProvider) return { needsSetup: true, reason: `Provider "${config.provider_id}" 不存在` };
    if (!currentProvider.apiKey) return { needsSetup: true, reason: `Provider 未配置 API Key` };

    return { needsSetup: false };
}
```

**应用**：Chat.tsx 启动时检查，失败则进入 SetupWizard。

---

## 相关文件

- `zen-code/src/chat/commands/memoryClearCommand.ts` - 记忆整理命令
- `zen-code/src/chat/context/CommandHandler.tsx` - 命令处理器
- `packages/agent/src/memories/analyze.ts` - 记忆分析（名称规范化）
- `zen-code/src/chat/utils/configValidation.ts` - 配置验证工具
