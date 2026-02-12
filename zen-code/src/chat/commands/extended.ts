/**
 * 扩展命令示例 - 展示如何添加更多命令
 * 这个文件可以作为添加新命令的参考
 */

import { configStore } from '../store/index';
import { type CommandDefinition } from './types';

/**
 * /status 命令 - 显示系统状态
 */
export const statusCommand: CommandDefinition = {
    name: 'status',
    description: '显示当前聊天状态信息',
    aliases: ['stat', 'info'],
    execute: async (args: string[], context) => {
        const agentInfo = context.client?.availableAssistants.find((a: any) => a.graph_id === context.currentAgent);

        const statusInfo = [
            `当前代理: ${agentInfo?.name || '未选择'} (${context.currentAgent || 'N/A'})`,
            `聊天ID: ${context.client?.currentChatId?.slice(-8) || 'N/A'}`,
            `可用代理数: ${context.client?.availableAssistants?.length || 0}`,
            `模型: ${context.extraParams?.model_id || 'N/A'}`,
        ].join('\n');

        return {
            success: true,
            message: statusInfo,
            shouldClearInput: true,
        };
    },
};
import { listTemplates, clearTemplateCache } from '@codegraph/agent/src/templates/load.js';
/**
 * /template 命令 - 插入预定义模板
 */
export const templateCommand: CommandDefinition = {
    name: 'template',
    description: '插入预定义的消息模板',
    aliases: ['tpl', 't'],
    usage: '/template <模板名>',
    execute: async (args: string[], context) => {
        const templateName = args[0];

        // MODIFIED: 使用动态模板加载器替代硬编码模板
        // 导入模板加载器

        // 如果传入 --refresh 参数，清除缓存
        if (args.includes('--refresh')) {
            clearTemplateCache();
            return {
                success: true,
                message: '模板缓存已清除',
                shouldClearInput: true,
            };
        }

        // 加载所有模板
        const templates = listTemplates();

        // 如果没有提供模板名，列出所有可用模板
        if (!templateName) {
            if (templates.length === 0) {
                return {
                    success: true,
                    message: '当前没有可用的模板。可以在 ./.claude/templates/ 目录下创建 .md 模板文件。',
                    shouldClearInput: true,
                };
            }

            const templateList = templates.map((t) => `  - ${t.name}: ${t.description}`).join('\n');

            return {
                success: true,
                message: `可用模板:
${templateList}

使用 /template <name> 插入模板`,
                shouldClearInput: true,
            };
        }

        // 查找指定模板
        const template = templates.find((t) => t.name === templateName);

        if (!template) {
            const availableTemplates = templates.map((t) => t.name).join(', ');
            return {
                success: false,
                message: `未找到模板 "${templateName}"。可用模板: ${availableTemplates || '(无)'}`,
            };
        }

        setTimeout(() => {
            // 将模板内容设置到输入框
            context.setUserInput(template.content);
        }, 300);

        return {
            success: true,
            message: `已插入模板: ${template.name}
${template.description}`,
            shouldClearInput: false, // 不清空，让用户编辑模板
        };
    },
};

/**
 * /config 命令 - 配置管理
 */
export const configCommand: CommandDefinition = {
    name: 'config',
    description: '查看或设置配置项',
    aliases: ['cfg', 'set'],
    usage: '/config [key] [value]',
    execute: async (args: string[], context) => {
        // 无参数：显示所有配置
        if (args.length === 0) {
            const config = await configStore.getConfig();

            const configLines = [
                '当前配置:',
                configStore.getConfigPath(),
                `  model_id: ${config.model_id || 'N/A'}`,
                `  provider_id: ${config.provider_id || 'N/A'}`,
                `  enable_thinking: ${config.enable_thinking ?? true}`,
                `  compact_mode: ${config.compact_mode ?? false}`,
                `  stream_refresh_interval: ${config.stream_refresh_interval}`,
                '',
                '可用 Provider:',
            ];

            if (config.providers && config.providers.length > 0) {
                config.providers.forEach((p) => {
                    const hasKey = !!p.apiKey;
                    configLines.push(
                        `  - [${p.id}] type: ${p.type}, url: ${p.baseUrl}, key: ${hasKey ? '***已设置***' : '未设置'}`,
                    );
                });
            } else {
                configLines.push('  (无已配置的 Provider)');
            }

            configLines.push(
                '',
                '使用方法:',
                '  /config <key> <value>  - 设置配置项',
                '  /config <key>          - 查看配置项',
                '',
                '可用配置项:',
                '  model_id               - 当前使用的模型 ID',
                '  provider_id            - 当前使用的 Provider ID',
                '  enable_thinking        - 启用思考模式 (true, false)',
                '  compact_mode           - 紧凑模式 (true, false)',
                '  stream_refresh_interval - 流刷新间隔',
            );

            return {
                success: true,
                message: configLines.join('\n'),
                shouldClearInput: true,
            };
        }
        const key = args[0];
        const validKeys = ['enable_thinking', 'stream_refresh_interval', 'provider_id', 'model_id', 'compact_mode'];

        if (!validKeys.includes(key)) {
            return {
                success: false,
                message: `无效的配置项: ${key}
可用配置项: ${validKeys.join(', ')}`,
                shouldClearInput: true,
            };
        }

        // 只有一个参数：查看配置项
        if (args.length === 1) {
            const config = (await configStore.getConfig()) as any;
            let value = config[key];

            return {
                success: true,
                message: `${key}: ${value ?? '未设置'}`,
                shouldClearInput: true,
            };
        }

        // 两个或多个参数：设置配置项
        let value: any = args.slice(1).join(' ');

        // 特殊处理布尔值
        if (key === 'enable_thinking' || key === 'compact_mode') {
            if (value === 'true' || value === '1' || value === 'yes') {
                value = true;
            } else if (value === 'false' || value === '0' || value === 'no') {
                value = false;
            }
        }

        // 特殊处理数字
        if (key === 'stream_refresh_interval') {
            const num = parseInt(value, 10);
            if (!isNaN(num)) {
                value = num;
            }
        }

        try {
            if (!context.updateConfig) {
                return {
                    success: false,
                    message: '无法访问配置更新功能',
                    shouldClearInput: true,
                };
            }

            await context.updateConfig({ [key]: value });

            let message = `配置已更新: ${key} = ${value} 重启程序生效`;

            // 如果更新的是 model_id 或 provider_id，提示用户可能需要重启
            if (key === 'model_id' || key === 'provider_id') {
                message += `

提示: 更换模型或提供商后，请重启程序以确保完整生效`;
            }

            return {
                success: true,
                message,
                shouldClearInput: true,
            };
        } catch (error) {
            return {
                success: false,
                message: `配置更新失败: ${error instanceof Error ? error.message : String(error)}`,
                shouldClearInput: true,
            };
        }
    },
};

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
 * /summarize 命令 - 智能总结和记忆提取
 */
export const summarizeCommand: CommandDefinition = {
    name: 'summarize',
    description: '智能总结对话并提取有价值信息保存为记忆',
    aliases: ['sum', 'summary', 'compact'],
    usage: '/sum',
    execute: async (args: string[], context) => {
        // 检查是否有聊天记录
        if (!context.renderMessages || context.renderMessages.length === 0) {
            return {
                success: false,
                message: '当前会话没有消息可以总结',
                shouldClearInput: true,
            };
        }

        const messageCount = context.renderMessages.length;

        try {
            // 构建包含 switch_command 的 extraParams
            const summarizeExtraParams = {
                ...context.extraParams,
                switch_command: 'smart_memory',
            };

            // 发送空消息触发 smart_memory 分支
            await context.sendMessage([], { extraParams: summarizeExtraParams });

            return {
                success: true,
                message: `正在智能分析 ${messageCount} 条消息并提取记忆...`,
                shouldClearInput: true,
            };
        } catch (error) {
            return {
                success: false,
                message: `总结失败: ${error instanceof Error ? error.message : String(error)}`,
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
 * /knowledge 命令 - 切换知识库面板
 */
export const knowledgeCommand: CommandDefinition = {
    name: 'knowledge',
    description: '打开知识库面板',
    aliases: ['k'],
    execute: async (args: string[], context) => {
        // MODIFIED: 通过 context 回调切换面板
        if (context.switchToKnowledge) {
            context.switchToKnowledge();
            return {
                success: true,
                message: '已打开知识库面板',
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
    description: '打开模型选择面板',
    aliases: ['mp', 'm'],
    execute: async (args: string[], context) => {
        if (context.switchToSettings) {
            context.switchToSettings();
            return {
                success: true,
                message: '已打开模型选择面板',
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
    statusCommand,
    templateCommand,

    configCommand,
    mcpCommand,
    summarizeCommand, // NEW: 添加总结命令
    historyCommand, // NEW: 添加历史面板命令
    knowledgeCommand, // NEW: 添加知识库面板命令
    closePanelCommand, // NEW: 添加关闭面板命令
    modelPanelCommand, // NEW: 添加模型面板命令
    ralphCommand, // NEW: 添加 Ralph 循环命令
];
