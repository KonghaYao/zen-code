/**
 * Command System Middleware
 *
 * 将所有工具调用转换为统一的 batch_command 格式。
 *
 * 特性：
 * - 拦截所有工具调用，转换为 {name, args} 格式
 * - 支持批量调用，通过 batch_command 工具
 * - 静态工具描述，支持 Anthropic Prompt Caching
 * - 运行时工具查询，通过 list_available_commands
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
                name: z.string().describe('工具名称'),
                args: z.record(z.string(), z.any()).describe('工具参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的命令列表'),
});

export type BatchCommand = z.infer<typeof BatchCommandSchema>;

/**
 * 工具注册表
 */
interface ToolRegistry {
    [name: string]: StructuredTool;
}

/**
 * Command System Middleware
 *
 * 将底层工具包装为统一的 batch_command 接口。
 */
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private registry: ToolRegistry = {};
    private batchCommandTool: StructuredTool;
    private listCommandsTool: StructuredTool;

    constructor() {
        // 创建 batch_command 工具
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
                            error: `Unknown tool: ${name}. Available: ${Object.keys(this.registry).join(', ')}`,
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
                description: `批量执行多个工具命令。在一个调用中并行执行多个工具操作。

使用格式：
- commands: 命令数组，每个命令包含 name 和 args

示例：
- 同时读取多个文件: {commands: [{name: "read_file", args: {file_path: "/path/file1.txt"}}, {name: "read_file", args: {file_path: "/path/file2.txt"}}]}
- 搜索后读取: {commands: [{name: "grep", args: {pattern: "function", path: "./src"}}, {name: "read_file", args: {file_path: "./src/main.js"}}]}

重要：
- 所有命令独立执行，失败不影响其他命令
- 返回结果按命令顺序排列
- 适合批量操作和并行执行独立任务`,
                schema: BatchCommandSchema,
            },
        );

        // 创建 list_available_commands 工具
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
                description: `查询当前所有可用工具的列表和详细信息。

返回：
- name: 工具名称
- description: 工具描述和用法

使用场景：
- 动态查询可用工具列表
- 了解工具参数格式
- 验证工具名称和参数

重要：系统工具列表是动态的，建议在需要时调用此工具获取最新信息。`,
                schema: z.object({}),
            },
        );
    }

    /**
     * 获取 middleware 提供的工具
     */
    get tools(): StructuredTool[] {
        return [this.batchCommandTool, this.listCommandsTool];
    }

    /**
     * 包装模型调用，注入系统提示词
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `

## Command System 工具使用指南

所有工具调用通过统一的 Batch Command 格式进行：

**核心工具**：
- \`batch_command\` - 批量执行多个命令，格式：{commands: [{name, args}, ...]}
- \`list_available_commands\` - 查询所有可用工具的列表和参数定义

**使用示例**：
- 读取文件：{commands: [{name: "read_file", args: {file_path: "/path/to/file"}}]}
- 搜索代码：{commands: [{name: "grep", args: {pattern: "function", path: "./src"}}]}
- 批量操作：{commands: [{name: "read_file", args: {...}}, {name: "grep", args: {...}}]}

**重要**：
- 系统提示词和工具描述保持静态以支持 Prompt Caching
- 工具列表动态查询，使用 list_available_commands 获取最新信息
- 所有工具调用必须使用 batch_command，即使单个操作也包装为数组
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
     * 注册底层工具
     *
     * @param tools - 要注册的工具列表
     */
    registerTools(tools: StructuredTool[]): void {
        for (const tool of tools) {
            this.registry[tool.name] = tool;
        }
    }

    /**
     * 获取已注册的工具列表
     */
    getRegisteredTools(): StructuredTool[] {
        return Object.values(this.registry);
    }
}
