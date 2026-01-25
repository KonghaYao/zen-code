# AGENTS.md 更新规划

## 目标
确保 AGENTS.md 与当前代码实现完全一致

## 发现的差异

### 1. Middleware System - 代码示例过时

**问题**：文档中的代码示例与 `packages/agent/src/subagents/factory.ts` 实际实现有显著差异

**当前文档**：
```typescript
// 示例显示了错误的中间件组合方式
// CommandSystem 直接添加到 middleware 数组
if (config.middleware.mcp) {
    commandSystem.registerTools(await MCPManager.getInstance().getAllTools());
}
middleware.push(commandSystem);
```

**实际代码**：
```typescript
// 1. CommandSystem 是独立实例，需要先注册工具
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool];
if (config.middleware.mcp) {
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...mcpTools);
}
commandSystem.registerTools(commandTools);

// 2. 中间件顺序不同（subagents 在最前）
// 3. HITL 配置更简洁
const interruptOn = { ...ask_user_with_options_config.interruptOn };
if (process.env.YOLO_MODE !== 'true') {
    Object.assign(interruptOn, {
        terminal: { allowedDecisions: ['approve', 'reject', 'edit'] }
    });
}
```

**需要更新**：
- 更新完整的代码示例以反映实际实现
- 修正中间件顺序
- 更新 HITL 配置方式
- 明确 CommandSystem 的工具注册流程

---

### 2. SubAgent System - 状态描述不准确

**问题**：文档描述与实际实现不符

**当前文档**：
```markdown
**Available Agents** (configured in `subagents/config.ts`):
- `default` - Full-featured assistant with all tools and middleware
- Future: `finder`, `planner`, `reviewer`, `debugger`, etc.
```

**实际代码** (`subagents/config.ts`):
```typescript
export async function loadAgentsList(): Promise<Record<string, AgentConfig>> {
    return {
        default: {
            id: 'default',
            name: 'Jarvis',
            description: '全功能代码助手',
            tools: ['all'],
            middleware: {
                agents_md: true,
                skills: true,
                memories: true,
                mcp: true,
                subagents: true,
            },
        },
    };
}
```

**SubAgentsMiddleware 实现** (`middlewares/subagents.ts`):
```typescript
subAgents = new Map<string, SubAgentCreator>();

private formatSubAgentsList(): string {
    if (this.subAgents.size === 0) {
        return '(No subagents available yet. You can add subagents using the addSubAgents method)';
    }
    // ...
}
```

**需要更新**：
- 删除 "Future: finder, planner..." 的误导性描述
- 明确说明当前只有一个 `default` agent
- 说明 SubAgentsMiddleware 已实现但未配置任何子代理
- 更新 "Future Extensions" 部分，说明实际扩展点

---

### 3. Adding Features - 工具组织结构变化

**问题**：文档中的工具文件组织说明与实际不符

**当前文档**：
```markdown
### Add New Tool

// packages/agent/src/tools/my_tool/index.ts
export const my_tool = tool(...);

// Export from tools/my_tool/index.ts (not tools/index.ts)

// Register in factory.ts: Import and add to ALL_TOOLS array
```

**实际代码结构**：
```
packages/agent/src/tools/
├── filesystem_tools/   # read, write, glob, grep, folder, replace
│   └── index.ts        # export * from './xxx_tool.js'
├── bash_tools/         # bash execution
│   └── index.ts        # export const bash_tools = [bash_tool]
└── task_tools/         # todo, add_task
    └── index.ts        # export * from './xxx_tool.js'
```

**factory.ts 实际导入方式**：
```typescript
// 分组导入
import { glob_tool, grep_tool, read_tool, write_tool, replace_tool, folder_tool }
    from '../tools/filesystem_tools/index.js';
import { bash_tools } from '../tools/bash_tools/index.js';
import { todo_write_tool, add_task_tool } from '../tools/task_tools/index.js';

const ALL_TOOLS = [
    ask_user_with_options,
    todo_write_tool,
    add_task_tool,
    glob_tool,
    grep_tool,
    read_tool,
    write_tool,
    replace_tool,
    folder_tool,
    ...bash_tools,  // 展开数组
] as const;
```

**需要更新**：
- 修正工具文件组织说明（按功能分组）
- 更新 "Add New Tool" 步骤以反映实际结构
- 说明是否需要在 `filesystem_tools/` 添加新工具，还是创建新分组

---

### 4. Command System - 实现细节变化

**问题**：Command System 的实现细节与文档描述有差异

**当前文档**：
```markdown
**MCP Integration**:
- MCP tools exposed through CommandSystemMiddleware
- MCPManager singleton manages connections and tool caching
```

**实际实现** (`middlewares/commandSystem.ts`):
```typescript
export class CommandSystemMiddleware implements AgentMiddleware {
    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listCommandsTool: StructuredTool;

    registerTools(tools: StructuredTool[]): void {
        for (const tool of tools) {
            this.registry[tool.name] = tool;
        }
    }

    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // 通过 wrapModelCall 注入系统提示词
        const systemPromptAddon = `## Command System...`;
        // ...
    }
}
```

**factory.ts 使用方式**：
```typescript
const commandSystem = new CommandSystemMiddleware();
const commandTools = [read_tool, glob_tool];  // 手动指定哪些工具注册到 CommandSystem
if (config.middleware.mcp) {
    const mcpTools = await MCPManager.getInstance().getAllTools();
    commandTools.push(...mcpTools);
}
commandSystem.registerTools(commandTools);
middleware.push(commandSystem);
```

**需要更新**：
- 说明 CommandSystem 不是自动注册所有工具
- 明确哪些工具被注册到 CommandSystem（read_tool, glob_tool + MCP tools）
- 更新系统提示词注入机制说明（通过 wrapModelCall）

---

### 5. Tool System - 工具分类更新

**问题**：工具列表可能不完整或分类有误

**当前文档**：
```markdown
**Categories**:
- `filesystem_tools` - read, write, glob, grep, folder operations
- `bash_tools` - terminal command execution
- `memory` - memory storage and retrieval
- `task_tools` - todo list management
```

**实际工具列表** (`factory.ts`):
```typescript
const ALL_TOOLS = [
    ask_user_with_options,     // 交互工具
    todo_write_tool,           // 任务工具
    add_task_tool,             // 任务工具
    glob_tool,                 // 文件系统
    grep_tool,                 // 文件系统
    read_tool,                 // 文件系统
    write_tool,                // 文件系统
    replace_tool,              // 文件系统
    folder_tool,               // 文件系统
    ...bash_tools,             // Bash (bash_tool)
];
```

**需要更新**：
- 添加 `ask_user_with_options` 交互工具类别
- 确认是否还有其他工具未列出
- 更新每个类别的具体工具名称

---

## 更新方案

### 方案 1: 全面更新（推荐）
更新所有 5 个发现的差异，确保文档与代码 100% 一致

**优点**：文档完整准确
**缺点**：改动较大

### 方案 2: 分阶段更新
1. 先更新关键部分（Middleware System, SubAgent System）
2. 再更新次要部分（Adding Features, Command System, Tool System）

**优点**：风险更小，容易审核
**缺点**：需要多次 PR

### 方案 3: 最小更新
只更新可能导致误解的部分（SubAgent System 状态, Middleware 代码示例）

**优点**：改动最小
**缺点**：文档仍有小瑕疵

---

## 建议的更新顺序

如果选择**方案 1（全面更新）**，建议按以下顺序：

1. **SubAgent System** - 修正状态描述（最高优先级，避免误导）
2. **Middleware System** - 更新代码示例（核心架构）
3. **Adding Features** - 修正工具组织说明（开发者常用）
4. **Command System** - 更新实现细节（补充说明）
5. **Tool System** - 确认工具列表完整性（完善细节）

---

## 后续行动

请审核此规划文件，确认：
1. 是否同意发现的 5 个差异点
2. 选择哪个更新方案（1/2/3）
3. 是否有其他需要更新的内容

审核通过后，我将执行更新并提交 PR。
