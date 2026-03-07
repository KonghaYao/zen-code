# .codebase 文件夹通用规范

## 概述

`.codebase` 是一个为 AI Agent 提供项目感知的**模块级知识库**。它是一个通用的架构规范，可用于任何类型的项目。

## 核心理念

1. **文件为维度**：每个重要文件一个章节
2. **只标记重点**：不写全部代码，只记录关键信息
3. **渐进式披露**：从索引到模块，从模块到文件

---

## 文件夹结构

```
.codebase/
├── INDEX.md                    # 项目索引（必需）
└── [module-path]/              # 模块目录（按实际项目结构）
    └── [module].md             # 模块文档
```

**示例**：

```
.codebase/
├── INDEX.md
├── src/
│   ├── api.md
│   ├── services.md
│   └── utils.md
└── packages/
    ├── core.md
    └── ui.md
```

---

## INDEX.md 规范

```markdown
# .codebase 索引

## 项目概览

[1-3 句话描述项目]

## 模块索引

| 模块     | 文档   | 职责         |
| -------- | ------ | ------------ |
| [模块名] | [链接] | [一句话职责] |

## AI Agent 使用指南

1. [步骤1]
2. [步骤2]
```

---

## 模块文档规范

每个模块 md 文件遵循以下结构：

```markdown
# [模块名称]

> 路径：`[实际路径]`

## 概述

[1-3 句话描述模块职责]

## 文件结构
```

[模块名]/ ├── [文件].ts # [简要说明] └── [目录]/ # [简要说明]

```

---

## 文件：[filename.ts]

### 概述
[这个文件做什么]

### 关键导出

#### `functionName`
> 用途：[一句话]
- 重点：[需要注意的点]
- 重点：[需要注意的点]

#### `ClassName`
> 用途：[一句话]
- 重点：[需要注意的点]

#### `CONSTANT`
> 用途：[一句话]

### 依赖关系
- 依赖：[哪些模块/文件]
- 被依赖：[被哪些模块/文件使用]

---

## 文件：[another-file.ts]

### 概述
[这个文件做什么]

### 关键导出

#### `exportName`
> 用途：[一句话]
- 重点：[需要注意的点]

---

## 注意要点

1. **[重要约束1]**：[说明]
2. **[重要约束2]**：[说明]
```

---

## 示例：packages/standard-agent.md

```markdown
# standard-agent

> 路径：`packages/standard-agent/`

## 概述

Agent 系统的核心框架库，提供 AgentPackage、中间件基类、存储抽象等通用能力。

## 文件结构
```

standard-agent/ ├── src/ │ ├── package.ts # AgentPackage 核心类 │ ├── repository.ts # CRUD 操作 │ ├──
validator.ts # 配置验证 │ ├── storage/ # 存储抽象 │ └── middlewares/ # 中间件基类 └── package.json

````

---

## 文件：package.ts

### 概述

AgentPackage 核心类，统一管理工具、中间件、提示词的注册和创建。

### 关键导出

#### `AgentPackage`
> 用途：Agent 系统的中央协调器

- 重点：使用 `fromStorage()` 静态方法创建实例
- 重点：通过 `tools.register()` 注册运行时工具
- 重点：通过 `createTool()` / `createMiddleware()` 创建配置

```typescript
// 创建实例
const pkg = await AgentPackage.fromStorage(storage);

// 注册工具
pkg.tools.register('my_tool', toolImpl);

// 创建 agent
const agent = await createAgent({ pkg, model, systemPrompt });
````

#### `AgentPackage.fromStorage(storage)`

> 用途：从存储创建 AgentPackage 实例

- 重点：storage 必须实现 Storage 接口

---

## 文件：repository.ts

### 概述

提供 Agent 相关资源的 CRUD 操作。

### 关键导出

#### `AgentRepository`

> 用途：管理 models、prompts、tools、middlewares、agents 的 CRUD

- 重点：所有操作通过存储层持久化

---

## 文件：storage/memory.ts

### 概述

内存存储实现，用于测试和临时场景。

### 关键导出

#### `MemoryStorage`

> 用途：内存中的存储实现

- 重点：进程重启后数据丢失

---

## 文件：middlewares/base.ts

### 概述

中间件基类定义。

### 关键导出

#### `AgentMiddleware`

> 用途：所有中间件的基类

- 重点：必须实现 `handle()` 方法
- 重点：通过 `priority` 控制执行顺序

---

## 注意要点

1. **框架层原则**：不依赖应用层代码
2. **依赖注入**：应用层通过回调注入具体实现
3. **存储抽象**：使用 Storage 接口，支持多种后端

````

---

## 示例：zen-code/chat.md

```markdown
# chat

> 路径：`zen-code/src/chat/`

## 概述

TUI 聊天核心逻辑，包含状态管理、hooks、组件等。

## 文件结构

````

chat/ ├── context/ # React Context ├── hooks/ # TanStack Query hooks ├── components/ # UI 组件 ├── query-keys.ts # Query
key 定义 └── QueryClientProvider.tsx

````

---

## 文件：query-keys.ts

### 概述

TanStack Query 的 key 定义，用于缓存管理。

### 关键导出

#### `queryKeys`
> 用途：统一的 query key 工厂
- 重点：所有 query key 必须从这里定义
- 重点：使用层级结构组织 key

```typescript
export const queryKeys = {
  config: () => ['config'] as const,
  tasks: () => ['tasks'] as const,
  history: (threadId: string) => ['history', threadId] as const,
};
````

---

## 文件：hooks/useConfig.ts

### 概述

配置管理的 TanStack Query hooks。

### 关键导出

#### `useConfig()`

> 用途：获取配置

- 重点：自动同步到 process.env

#### `useUpdateConfig()`

> 用途：更新配置

- 重点：更新后自动同步环境变量

---

## 文件：context/SettingsContext.tsx

### 概述

设置相关的 React Context。

### 关键导出

#### `SettingsProvider`

> 用途：提供设置上下文

- 重点：必须在应用根部使用

#### `useSettings()`

> 用途：获取设置上下文

- 重点：只能在 SettingsProvider 内使用

---

## 注意要点

1. **Hook 位置**：所有 TanStack Query hooks 必须在 `hooks/` 目录
2. **Query Key**：必须使用 `query-keys.ts` 定义的 key
3. **Context 分离**：Context 和 hooks 分开文件

````

---

## Skills 系统

### Skill 1: codebase-init（创建）

**用途**：初始化创建整个 `.codebase` 知识库

**位置**：`.claude/skills/codebase-init/SKILL.md`

```markdown
---
name: 'codebase-init'
description: 'Initialize .codebase knowledge base for the entire project. Use when setting up .codebase for the first time or recreating from scratch.'
---

# Codebase Init Skill

## 触发条件

- 首次创建 `.codebase` 知识库
- 重建整个知识库
- 用户显式请求 `/codebase-init`

## 执行流程

### Step 1: 扫描项目结构

1. 扫描项目根目录，识别所有模块
2. 确定模块层级关系
3. 生成模块列表

### Step 2: 创建 INDEX.md

1. 收集项目概览信息（从 package.json、README.md 等）
2. 生成模块索引表
3. 写入 `.codebase/INDEX.md`

### Step 3: 派发子任务（使用 SubAgent）

**重要**：必须使用 SubAgent 系统并行派发任务

````

主 Agent │ ├── SubAgent → 分析 packages/standard-agent/ → 生成 standard-agent.md │ ├── SubAgent
→ 分析 packages/agent-middlewares/ → 生成 agent-middlewares.md │ ├── SubAgent → 分析 packages/agent/ → 生成 agent.md │
├── SubAgent → 分析 zen-code/src/chat/ → 生成 chat.md │ └── ... (其他模块)

````

### SubAgent 任务模板

每个 SubAgent 接收以下信息：

```json
{
  "module_path": "packages/standard-agent",
  "output_file": ".codebase/packages/standard-agent.md",
  "task": "Analyze the module and generate .codebase documentation following the template"
}
````

SubAgent 任务描述示例：

```
分析 packages/standard-agent/ 模块，生成 .codebase/packages/standard-agent.md 文档。

要求：
1. 遵循模块文档模板
2. 以文件为维度组织内容
3. 只标记重点，不写全部代码
4. 标注依赖关系

模块路径：packages/standard-agent/
输出文件：.codebase/packages/standard-agent.md
```

### Step 4: 汇总结果

1. 收集所有 SubAgent 的生成结果
2. 验证文档完整性
3. 报告创建结果

## 使用示例

```
用户：/codebase-init

Agent：
1. 扫描项目，发现 12 个模块
2. 创建 INDEX.md
3. 派发 12 个 SubAgent 并行处理
4. 等待所有 SubAgent 完成
5. 验证并报告：成功创建 12 个模块文档
```

````

---

### Skill 2: codebase-update（更新）

**用途**：增量更新 `.codebase` 知识库

**位置**：`.claude/skills/codebase-update/SKILL.md`

```markdown
---
name: 'codebase-update'
description: 'Update .codebase knowledge base incrementally. Detects changes and updates only affected module docs.'
---

# Codebase Update Skill

## 触发条件

- 项目代码发生变更
- 用户显式请求 `/codebase-update`
- 定期维护时

## 执行流程

### Step 1: 检测变更

**方法 1：Git Diff（推荐）**

```bash
# 获取上次更新后的变更
git diff --name-only HEAD~10 -- '*.ts' '*.tsx'

# 或使用标签标记上次更新
git diff codebase-last-update -- '*.ts' '*.tsx'
````

**方法 2：文件时间戳**

对比 `.codebase/*.md` 的修改时间与源文件

**方法 3：手动指定**

用户指定要更新的模块

### Step 2: 分析影响范围

将变更文件映射到模块：

```
变更文件                          → 影响模块
─────────────────────────────────────────────
packages/standard-agent/src/package.ts  → standard-agent.md
packages/agent/src/graphBuilder.ts      → agent.md
zen-code/src/chat/hooks/useConfig.ts    → chat.md
```

### Step 3: 筛选需要更新的模块

```typescript
interface UpdatePlan {
    module: string;
    reason: string;
    changedFiles: string[];
    priority: 'high' | 'medium' | 'low';
}
```

优先级判断：

- **high**: 新增/删除文件、接口变更
- **medium**: 新增/修改导出函数
- **low**: 内部实现变更、注释修改

### Step 4: 派发子任务（使用 SubAgent）

只派发需要更新的模块：

```
主 Agent
    │
    ├── SubAgent → 更新 standard-agent.md (high priority)
    │
    ├── SubAgent → 更新 chat.md (medium priority)
    │
    └── (其他未变更模块不处理)
```

SubAgent 任务描述示例：

```
更新 .codebase/packages/standard-agent.md 文档。

变更原因：package.ts 新增了 createTool() 方法

变更文件：
- packages/standard-agent/src/package.ts

要求：
1. 读取现有文档
2. 分析变更内容
3. 增量更新相关章节
4. 保持其他内容不变

模块路径：packages/standard-agent/
输出文件：.codebase/packages/standard-agent.md
```

### Step 5: 更新 INDEX.md

如有新增/删除模块，同步更新 INDEX.md

### Step 6: 记录更新时间

```bash
# 可选：创建标签标记更新时间
git tag -f codebase-last-update
```

## 使用示例

```
用户：/codebase-update

Agent：
1. 检测到 3 个文件变更
2. 分析影响：2 个模块需要更新
3. 派发 2 个 SubAgent 并行处理
4. 等待完成
5. 报告：更新了 standard-agent.md, chat.md
```

## 变更检测策略

| 策略     | 适用场景       | 优点       | 缺点         |
| -------- | -------------- | ---------- | ------------ |
| Git Diff | Git 管理的项目 | 精确、快速 | 依赖 Git     |
| 时间戳   | 非 Git 项目    | 简单       | 不够精确     |
| 手动指定 | 局部更新       | 可控       | 需要用户输入 |

## 智能判断逻辑

```typescript
function shouldUpdateModule(modulePath: string, changedFiles: string[]): { update: boolean; reason: string } {
    // 1. 直接文件变更
    if (changedFiles.some((f) => f.startsWith(modulePath))) {
        return { update: true, reason: 'direct_file_change' };
    }

    // 2. 依赖文件变更（需要分析 import 关系）
    const deps = analyzeDependencies(modulePath);
    if (changedFiles.some((f) => deps.includes(f))) {
        return { update: true, reason: 'dependency_change' };
    }

    // 3. 公共类型变更
    if (changedFiles.some((f) => f.includes('types.ts') || f.includes('interfaces.ts'))) {
        return { update: true, reason: 'shared_type_change' };
    }

    return { update: false, reason: '' };
}
```

```

---

## 设计要点总结

| 要点 | 说明 |
|------|------|
| **文件为维度** | 每个文件一个 `## 文件：xxx` 章节 |
| **只标记重点** | 不写全部代码，只记录关键信息和注意事项 |
| **简洁导出** | `> 用途：xxx` + 几个 bullet points |
| **实用示例** | 只在必要时展示简短代码片段 |
| **依赖关系** | 标注文件的依赖和被依赖关系 |
```
