/**
 * Command System Middleware
 *
 * 将所有 Command 调用转换为统一的 batch_command 格式。
 *
 * 特性：
 * - 拦截所有 Command 调用，转换为 {name, args} 格式
 * - 支持批量调用，通过 batch_command Command
 * - 静态 Command 描述，支持 Anthropic Prompt Caching
 * - 运行时 Command 查询，通过 list_available_commands
 */

import { AgentMiddleware } from 'langchain';
import { tool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';

/**
 * 批量 Command 格式定义
 */
export const BatchCommandSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('Command 名称'),
                args: z.record(z.string(), z.any()).describe('Command 参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 Command 列表'),
});

export type BatchCommand = z.infer<typeof BatchCommandSchema>;

/**
 * Command 注册表
 */
interface ToolRegistry {
    [name: string]: StructuredTool;
}

/**
 * Command System Middleware
 *
 * 将底层 Command 包装为统一的 batch_command 接口。
 */
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listCommandsTool: StructuredTool;

    constructor() {
        // 创建 batch_command Command
        this.batchCommandTool = tool(
            async ({ commands }) => {
                const results: Array<{ tool: string; result: string; error?: string }> = [];

                for (const cmd of commands) {
                    const { name, args } = cmd;
                    const targetTool = this.registry[name];

                    if (!targetTool) {
                        results.push({
                            tool: name,
                            result: '',
                            error: `Unknown Command: ${name}. Available: ${Object.keys(this.registry).join(', ')}`,
                        });
                        continue;
                    }

                    try {
                        const result = await targetTool.invoke(args);
                        results.push({ tool: name, result });
                    } catch (error: any) {
                        results.push({
                            tool: name,
                            result: '',
                            error: error.message || String(error),
                        });
                    }
                }

                // 格式化返回结果
                return results
                    .map((r) => {
                        if (r.error) {
                            return `[${r.tool}] 错误: ${r.error}`;
                        }
                        return `[${r.tool}]\n${JSON.stringify(r.result)}`;
                    })
                    .join('\n\n');
            },
            {
                name: 'batch_command',
                description: `批量执行多个 Command。在一个调用中并行执行多个 Command 操作。

使用格式：
- commands: Command 数组，每个 Command 包含 name 和 args

示例：
- 同时读取多个文件: {commands: [{name: "read_file", args: {file_path: "/path/file1.txt"}}, {name: "read_file", args: {file_path: "/path/file2.txt"}}]}
- 搜索后读取: {commands: [{name: "grep", args: {pattern: "function", path: "./src"}}, {name: "read_file", args: {file_path: "./src/main.js"}}]}

重要：
- 所有 Command 独立执行，失败不影响其他 Command
- 返回结果按 Command 顺序排列
- 适合批量操作和并行执行独立任务`,
                schema: BatchCommandSchema,
            },
        );

        // 创建 list_available_commands Command
        this.listCommandsTool = tool(
            async () => {
                const toolInfo = Object.values(this.registry).map((t) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.schema
                }));

                return JSON.stringify(toolInfo, null, 2) + '\n\n Use batch_command tool to use command above only!';
            },
            {
                name: 'list_available_commands',
                description: `查询当前所有可用 Command 的列表和详细信息。

返回：
- name: Command 名称
- description: Command 描述和用法

使用场景：
- 动态查询可用 Command 列表
- 了解 Command 参数格式
- 验证 Command 名称和参数

重要：系统 Command 列表是动态的，建议在需要时调用此 Command 获取最新信息。`,
                schema: z.object({}),
            },
        );
    }

    /**
     * 获取 middleware 提供的 Command
     */
    get tools(): StructuredTool[] {
        return [this.batchCommandTool, this.listCommandsTool];
    }

    /**
     * 包装模型调用，注入系统提示词
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `
## Command System

Command System 是**额外工具扩展层**，提供工具发现和批量调用能力。

### 核心理念

**标准工具**（你已熟知的）：
- read_file, write_file, edit_file, glob_files, search-files-rg 等
- 这些工具已直接可用，无需通过 Command System

**扩展工具**（通过 Command System 发现）：
- 用户配置的 MCP 工具
- 部分系统工具
- 这些工具**需要先发现**，再调用

### 两个 Commands

1. **list_available_commands** - 工具发现器
   - 查询扩展层有哪些工具可用
   - 获取工具的参数格式和描述
   - 当你不确定"有什么工具"时使用

2. **batch_command** - 批量调用器
   - 统一调用一个或者多个工具
   - 格式：{commands: [{name: "tool_name", args: {...}}]}
   - 批量操作、并行执行、统一错误处理

### 工作流程

**场景 1：你知道扩展工具名**
\`\`\`
# 直接调用扩展工具
<tool_name>({参数})
\`\`\`

**场景 2：你不确定有什么扩展工具**
\`\`\`
# 第一步：发现工具
list_available_commands()
→ 返回所有可用扩展工具列表

# 第二步：使用工具
batch_command({
  commands: [{name: "<发现的工具名>", args: {...}}]
})
\`\`\`

### 关键理解

- **扩展层**：Command System 不是工具的全部，而是额外扩展
- **发现机制**：通过 list_available_commands 探索可用能力
- **按需使用**：已知工具直接调用，未知工具先发现再调用
- **动态性**：扩展工具列表可能变化，运行时查询获取最新信息
`;

        // 创建新的系统提示词
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + systemPromptAddon;
        } else {
            newSystemPrompt = systemPromptAddon;
        }

        // 创建修改后的请求
        const modifiedRequest = {
            ...request,
            systemPrompt: newSystemPrompt,
        };

        // 调用处理器
        return await handler(modifiedRequest);
    }

    /**
     * 注册底层 Command
     *
     * @param tools - 要注册的 Command 列表
     */
    registerTools(tools: StructuredTool[]): void {
        for (const tool of tools) {
            this.registry[tool.name] = tool;
        }
    }

    /**
     * 获取已注册的 Command 列表
     */
    getRegisteredTools(): StructuredTool[] {
        return Object.values(this.registry);
    }
}
