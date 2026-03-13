/**
 * 扩展命令示例 - 展示如何添加更多命令
 * 这个文件可以作为添加新命令的参考
 */

import { type CommandDefinition } from './types';

/**
 * /mcp 命令 - MCP 配置管理
 */
export const mcpCommand: CommandDefinition = {
    name: 'mcp',
    description: '管理 MCP 服务器配置',
    aliases: [],
    usage: '/mcp [list|add|remove|get] [args]',
    execute: async (args: string[], context) => {
        if (args.length === 0) {
            return {
                success: true,
                message: [
                    'MCP 配置管理命令:',
                    '',
                    '用法:',
                    '  /mcp list              - 列出所有 MCP 服务器',
                    '  /mcp add <name> <json_string> - 添加 MCP 服务器 (传统格式)',
                    '  /mcp remove <name>     - 移除 MCP 服务器',
                    '  /mcp get <name>        - 查看 MCP 服务器详情',
                    '',
                    '示例 (JSON 格式):',
                    '  /mcp add context7 {"name":"context7","url":"https://mcp.context7.com/mcp"}',
                    '',
                ].join('\n'),
                shouldClearInput: true,
            };
        }

        const action = args[0];

        try {
            // 获取当前配置
            const currentConfig = context.extraParams || {};
            const mcpConfig = currentConfig.mcp_config || {};

            switch (action) {
                case 'list': {
                    const serverNames = Object.keys(mcpConfig);
                    if (serverNames.length === 0) {
                        return {
                            success: true,
                            message: '当前未配置任何 MCP 服务器',
                            shouldClearInput: true,
                        };
                    }

                    const serverList = serverNames
                        .map((name) => {
                            return ` - ${name}`;
                        })
                        .join('\n');

                    return {
                        success: true,
                        message: `已配置的 MCP 服务器:
${serverList}`,
                        shouldClearInput: true,
                    };
                }

                case 'add': {
                    if (args.length < 2) {
                        return {
                            success: false,
                            message: '用法: /mcp add <name> <json_string>',
                            shouldClearInput: true,
                        };
                    }
                    const [_, name, ...json] = args;
                    const json_string = json.join('');
                    const newMcpConfig = {
                        ...mcpConfig,
                        [name]: JSON.parse(json_string),
                    };

                    if (!context.updateConfig) {
                        return {
                            success: false,
                            message: '无法访问配置更新功能',
                            shouldClearInput: true,
                        };
                    }

                    await context.updateConfig({ mcp_config: newMcpConfig });

                    return {
                        success: true,
                        message: `MCP 服务器 "${name}" 已添加`,
                        shouldClearInput: true,
                    };
                }

                case 'remove': {
                    if (args.length < 2) {
                        return {
                            success: false,
                            message: '用法: /mcp remove <name>',
                            shouldClearInput: true,
                        };
                    }

                    const name = args[1];

                    if (!mcpConfig[name]) {
                        return {
                            success: false,
                            message: `MCP 服务器 "${name}" 不存在`,
                            shouldClearInput: true,
                        };
                    }

                    const newMcpConfig = { ...mcpConfig };
                    delete newMcpConfig[name];

                    if (!context.updateConfig) {
                        return {
                            success: false,
                            message: '无法访问配置更新功能',
                            shouldClearInput: true,
                        };
                    }

                    await context.updateConfig({ mcp_config: newMcpConfig });

                    return {
                        success: true,
                        message: `MCP 服务器 "${name}" 已移除
重启程序生效`,
                        shouldClearInput: true,
                    };
                }

                case 'get': {
                    if (args.length < 2) {
                        return {
                            success: false,
                            message: '用法: /mcp get <name>',
                            shouldClearInput: true,
                        };
                    }

                    const name = args[1];
                    const server = mcpConfig[name];

                    if (!server) {
                        return {
                            success: false,
                            message: `MCP 服务器 "${name}" 不存在`,
                            shouldClearInput: true,
                        };
                    }

                    return {
                        success: true,
                        message: [
                            `MCP 服务器: ${name}`,
                            `  URL: ${server.url}`,
                            `  Headers: ${JSON.stringify(server.headers || {}, null, 2)}`,
                        ].join('\n'),
                        shouldClearInput: true,
                    };
                }

                default:
                    return {
                        success: false,
                        message: `未知操作: ${action}
可用操作: list, add, remove, get`,
                        shouldClearInput: true,
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `MCP 操作失败: ${error instanceof Error ? error.message : String(error)}`,
                shouldClearInput: true,
            };
        }
    },
};

/**
 * /history 命令 - 切换历史面板
 */
export const historyCommand: CommandDefinition = {
    name: 'history',
    description: '打开历史面板',
    aliases: ['h'],
    execute: async (args: string[], context) => {
        // MODIFIED: 通过 context 回调切换面板
        if (context.switchToHistory) {
            context.switchToHistory();
            return {
                success: true,
                message: '已打开历史面板',
                shouldClearInput: true,
            };
        }
        return {
            success: false,
            message: '面板切换功能不可用',
            shouldClearInput: true,
        };
    },
};

/**
 * /close 命令 - 关闭面板返回聊天
 */
export const closePanelCommand: CommandDefinition = {
    name: 'close',
    description: '关闭当前面板返回聊天',
    aliases: ['c', 'q'],
    execute: async (args: string[], context) => {
        if (context.closePanel) {
            context.closePanel();
            return {
                success: true,
                message: '已关闭面板',
                shouldClearInput: true,
            };
        }
        return {
            success: false,
            message: '面板关闭功能不可用',
            shouldClearInput: true,
        };
    },
};

/**
 * /model-panel 命令 - 打开模型选择面板
 */
export const modelPanelCommand: CommandDefinition = {
    name: 'model',
    description: '打开模型/Provider配置面板',
    aliases: ['mp', 'm'],
    execute: async (args: string[], context) => {
        if (context.switchToModelProvider) {
            context.switchToModelProvider();
            return {
                success: true,
                message: '已打开模型/Provider配置面板',
                shouldClearInput: true,
            };
        }
        return {
            success: false,
            message: '模型面板切换功能不可用',
            shouldClearInput: true,
        };
    },
};

/**
 * /ralph 命令 - 循环执行直到返回 <COMPLETE></COMPLETE>
 */
export const ralphCommand: CommandDefinition = {
    name: 'ralph',
    description: '进入循环模式，持续发送响应直到返回 <COMPLETE></COMPLETE>',
    aliases: [],
    usage: '/ralph <text>',
    requiresArgs: true,
    execute: async (args: string[], context) => {
        const text = args.join(' ');

        if (!text.trim()) {
            return {
                success: false,
                message: '请提供要循环的文本内容',
                shouldClearInput: true,
            };
        }

        // 检查是否有 startRalphLoop 回调
        if (context.startRalphLoop) {
            context.startRalphLoop(text);
            return {
                success: true,
                message: `进入 Ralph 循环模式: "${text}"`,
                shouldClearInput: true,
            };
        }

        return {
            success: false,
            message: 'Ralph 循环功能不可用',
            shouldClearInput: true,
        };
    },
};

// 导出扩展命令列表
export const extendedCommands: CommandDefinition[] = [
    mcpCommand,
    historyCommand,
    closePanelCommand,
    modelPanelCommand,
    ralphCommand,
];
