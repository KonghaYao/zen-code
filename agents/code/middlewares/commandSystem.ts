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
                        return `[${r.tool}]\n${r.result}`;
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

                return JSON.stringify(toolInfo, null, 2);
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

Command System 是基础工具能力的扩充，提供批量调用和动态查询功能。

**扩充能力**：
- \`batch_command\` - 批量执行多个工具调用，格式：{commands: [{name, args}, ...]}
- \`list_available_commands\` - 查询所有已注册工具的完整列表（包括 MCP 工具、系统工具和其他工具）

**工具来源**：
- MCP 提供的工具
- 系统内置工具
- 其他注册的工具

**使用场景**：
1. **批量操作** - 需要同时执行多个独立任务时使用 batch_command
2. **工具发现** - 不确定可用工具时调用 list_available_commands 查询
3. **MCP 工具访问** - MCP 提供的工具通过 Command System 暴露

**示例**：
- 批量读取：{commands: [{name: "read_file", args: {file_path: "/path/file1"}}, {name: "read_file", args: {file_path: "/path/file2"}}]}
- 组合操作：{commands: [{name: "grep", args: {pattern: "function"}}, {name: "read_file", args: {file_path: "./src/main.js"}}]}

**重要**：
- Command System 不替代直接工具调用，而是提供额外的批量/查询能力
- 工具列表动态变化，运行时查询获取最新信息
- 批量调用中的工具独立执行，失败不影响其他操作
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
