/**
 * Command System Middleware
 *
 * 提供 MCP 工具的发现和执行能力。
 *
 * 特性：
 * - load_mcp_tools: 加载并查询所有可用的 MCP 工具列表
 * - execute_mcp_tool: 执行一个或多个 MCP 工具
 * - 静态 Command 描述，支持 Anthropic Prompt Caching
 */

import { AgentMiddleware } from 'langchain';
import { tool, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import { MCPManager } from '../mcp/MCPManager.js';

/**
 * MCP Tool Schema 定义
 */
export const LoadMcpToolsSchema = z.object({});

export const ExecuteMcpToolSchema = z.object({
    commands: z
        .array(
            z.object({
                name: z.string().describe('MCP 工具名称'),
                args: z.record(z.string(), z.any()).describe('工具参数，JSON 对象格式'),
            }),
        )
        .describe('要执行的 MCP 工具列表'),
});

export type ExecuteMcpTool = z.infer<typeof ExecuteMcpToolSchema>;

/**
 * Command System Middleware
 *
 * 提供 MCP 工具的发现和执行能力。
 */
export class CommandSystemMiddleware implements AgentMiddleware {
    name = 'CommandSystemMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;

    private mcpManager: MCPManager;
    private loadMcpToolsTool: StructuredTool;
    private executeMcpToolTool: StructuredTool;

    constructor() {
        this.mcpManager = MCPManager.getInstance();

        // 创建 load_mcp_tools Command
        this.loadMcpToolsTool = tool(
            async () => {
                const status = await this.mcpManager.getStatus();
                const tools = await this.mcpManager.getAllTools();

                return JSON.stringify(
                    {
                        tools: tools.map((t) => ({
                            name: t.name,
                            description: t.description,
                            schema: t.schema,
                        })),
                        status,
                    },
                    null,
                    2,
                );
            },
            {
                name: 'load_mcp_tools',
                description: `加载并查询所有可用的 MCP 工具列表。

返回：
- tools: MCP 工具列表，每个工具包含 name, description, schema
- status: MCP 连接状态，包含 toolCount, servers 等

使用场景：
- 查询当前有哪些 MCP 工具可用
- 获取工具的参数格式
- 检查 MCP 连接状态

重要：工具列表是动态的，建议在需要时调用此命令获取最新信息。`,
                schema: LoadMcpToolsSchema,
            },
        );

        // 创建 execute_mcp_tool Command
        this.executeMcpToolTool = tool(
            async ({ commands }) => {
                const results: Array<{ tool: string; result: any; error?: string }> = [];

                for (const cmd of commands) {
                    const { name, args } = cmd;

                    try {
                        // 通过 MCPManager 执行工具
                        const result = await this.mcpManager.executeTool(name, args);
                        results.push({ tool: name, result });
                    } catch (error: any) {
                        results.push({
                            tool: name,
                            result: null,
                            error: error.message || String(error),
                        });
                    }
                }

                // 格式化返回结果
                return JSON.stringify(
                    {
                        results,
                    },
                    null,
                    2,
                );
            },
            {
                name: 'execute_mcp_tool',
                description: `执行一个或多个 MCP 工具。

使用格式：
- commands: MCP 工具数组，每个工具包含 name 和 args

示例：
- 执行单个工具: {commands: [{name: "filesystem.read_file", args: {path: "/path/to/file"}}]}
- 执行多个工具: {commands: [{name: "tool1", args: {...}}, {name: "tool2", args: {...}}]}

重要：
- 所有工具独立执行，失败不影响其他工具
- 返回结果按命令顺序排列
- 适合批量执行 MCP 相关操作`,
                schema: ExecuteMcpToolSchema,
            },
        );
    }

    /**
     * 获取 middleware 提供的 Command
     */
    get tools(): StructuredTool[] {
        return [this.loadMcpToolsTool, this.executeMcpToolTool];
    }

    /**
     * 包装模型调用，注入系统提示词
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        const systemPromptAddon = `
## MCP Tools

使用 MCP 工具需要两步：

1. **load_mcp_tools** - 查询可用的 MCP 工具
   - 返回所有 MCP 工具的列表和参数格式
   - 包含 MCP 连接状态

2. **execute_mcp_tool** - 执行 MCP 工具
   - 支持单个或多个工具批量执行
   - 格式：{commands: [{name, args}, ...]}

**重要**：
- 标准工具（read_file, glob_files）直接调用，不需要通过 MCP 命令
- MCP 工具需要先调用 load_mcp_tools 查询
- 再调用 execute_mcp_tool 执行
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
}
