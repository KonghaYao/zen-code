/**
 * 命令注册和管理系统
 */

import type { CommandDefinition, CommandSuggestion, CommandResult, CommandContext } from './types';

export class CommandRegistry {
    private commands = new Map<string, CommandDefinition>();
    private aliases = new Map<string, string>();

    /**
     * 注册命令
     */
    register(command: CommandDefinition): void {
        this.commands.set(command.name, command);

        // 注册别名
        if (command.aliases) {
            command.aliases.forEach((alias) => {
                this.aliases.set(alias, command.name);
            });
        }
    }

    /**
     * 获取命令定义
     */
    getCommand(name: string): CommandDefinition | undefined {
        // 先检查是否为别名
        const realName = this.aliases.get(name) || name;
        return this.commands.get(realName);
    }

    /**
     * 获取所有命令
     */
    getAllCommands(): CommandDefinition[] {
        return Array.from(this.commands.values());
    }

    /**
     * 检查是否为命令输入
     */
    isCommand(input: string): boolean {
        return input.trim().startsWith('/');
    }

    /**
     * 解析命令输入
     */
    parseCommand(input: string): { command: string; args: string[] } | null {
        if (!this.isCommand(input)) {
            return null;
        }

        const trimmed = input.trim().slice(1); // 移除 '/'
        const parts = trimmed.split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        return { command, args };
    }

    /**
     * 执行命令
     */
    async executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
        const parsed = this.parseCommand(input);
        if (!parsed) {
            return {
                success: false,
                message: '无效的命令格式',
            };
        }

        const { command, args } = parsed;
        const commandDef = this.getCommand(command);

        if (!commandDef) {
            return {
                success: false,
                message: `未知命令: /${command}`,
            };
        }

        // 验证参数
        if (commandDef.requiresArgs && args.length === 0) {
            return {
                success: false,
                message: `命令 /${command} 需要参数。用法: ${commandDef.usage || `/${command} <args>`}`,
            };
        }

        if (commandDef.validateArgs && !commandDef.validateArgs(args)) {
            return {
                success: false,
                message: `命令 /${command} 参数无效。用法: ${commandDef.usage || `/${command} <args>`}`,
            };
        }

        try {
            return await commandDef.execute(args, context);
        } catch (error) {
            return {
                success: false,
                message: `命令执行失败: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * 获取命令建议（用于自动完成）
     */
    getSuggestions(input: string): CommandSuggestion[] {
        if (!input.startsWith('/')) {
            return [];
        }

        const query = input.slice(1).toLowerCase();
        const suggestions: CommandSuggestion[] = [];

        // 如果只输入了 /，显示常用命令（分类展示）
        if (query === '') {
            // 按类别组织的常用命令
            const popularCommands = [
                // 对话管理
                'new',
                'history',
                'task',
                // 面板切换
                'agent',
                'model',
                'settings',
                'mcp',
                'knowledge',
                // 功能命令
                'summarize',
                'template',
                'plan',
                'interview',
                // 帮助
                'help',
            ];
            for (const commandName of popularCommands) {
                const command = this.commands.get(commandName);
                if (command) {
                    suggestions.push({
                        command: commandName,
                        displayText: `/${commandName}`,
                        description: command.description,
                    });
                }
            }
            return suggestions.slice(0, 10); // 显示更多命令
        }

        // 定义常用命令优先级
        const priorityCommands = new Set(['history', 'knowledge', 'help', 'init', 'model', 'config']);

        // 匹配命令名称和别名
        const prefixMatches: CommandSuggestion[] = [];
        const includeMatches: CommandSuggestion[] = [];

        for (const [name, command] of this.commands) {
            const lowerName = name.toLowerCase();

            // 前缀匹配
            if (lowerName.startsWith(query)) {
                prefixMatches.push({
                    command: name,
                    displayText: `/${name}`,
                    description: command.description,
                });
            }
            // 包含匹配（非前缀）
            else if (lowerName.includes(query)) {
                includeMatches.push({
                    command: name,
                    displayText: `/${name}`,
                    description: command.description,
                });
            }

            // 检查别名
            if (command.aliases) {
                for (const alias of command.aliases) {
                    const lowerAlias = alias.toLowerCase();

                    if (lowerAlias.startsWith(query)) {
                        prefixMatches.push({
                            command: name,
                            displayText: `/${alias}`,
                            description: `${command.description} (别名)`,
                        });
                    } else if (lowerAlias.includes(query)) {
                        includeMatches.push({
                            command: name,
                            displayText: `/${alias}`,
                            description: `${command.description} (别名)`,
                        });
                    }
                }
            }
        }

        // 排序：优先级命令优先，然后按长度排序
        const sortFn = (a: CommandSuggestion, b: CommandSuggestion) => {
            const aPriority = priorityCommands.has(a.command) ? 1 : 0;
            const bPriority = priorityCommands.has(b.command) ? 1 : 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return a.displayText.length - b.displayText.length;
        };

        prefixMatches.sort(sortFn);
        includeMatches.sort(sortFn);

        suggestions.push(...prefixMatches, ...includeMatches);

        return suggestions.slice(0, 10); // 限制建议数量
    }

    /**
     * 获取命令帮助信息
     */
    getHelp(commandName?: string): string {
        if (commandName) {
            const command = this.getCommand(commandName);
            if (!command) {
                return `未找到命令: /${commandName}`;
            }

            let help = `命令: /${command.name}\n`;
            help += `描述: ${command.description}\n`;
            if (command.usage) {
                help += `用法: ${command.usage}\n`;
            }
            if (command.aliases && command.aliases.length > 0) {
                help += `别名: ${command.aliases.map((a) => `/${a}`).join(', ')}\n`;
            }
            return help;
        }

        // 显示所有命令
        let help = '可用命令:\n';
        for (const command of this.getAllCommands()) {
            help += `  /${command.name} - ${command.description}\n`;
        }
        help += '\n使用 /help <命令名> 获取具体命令的帮助信息';
        return help;
    }
}

// 全局命令注册实例
export const commandRegistry = new CommandRegistry();
