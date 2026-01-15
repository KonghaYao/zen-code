/**
 * 命令系统入口文件
 */

import { commandRegistry } from './registry';
import { builtinCommands } from './implementations';
import { extendedCommands } from './extended';
// NEW: Import agent switching commands
import { agentCommands } from './agentCommands';

// 注册内置命令
[...builtinCommands, ...extendedCommands, ...agentCommands].forEach((command) => {
    commandRegistry.register(command);
});

export { commandRegistry } from './registry';
export { type CommandResult, type CommandContext, type CommandDefinition, type CommandSuggestion } from './types';
