/**
 * 命令系统入口文件
 */

import { commandRegistry } from './registry';
import { builtinCommands } from './implementations';
import { extendedCommands } from './extended';
// NEW: Import agent switching commands
import { agentCommands } from './agentCommands';
// NEW: Import interview commands
import { interviewCommands } from './interviewCommand';
// NEW: Import plan commands
import { planCommands } from './planCommand';
// NEW: Import spark commands
import { sparkCommands } from './sparkCommand';
// NEW: Import spark-to-task commands
import { sparkToTaskCommands } from './sparkToTaskCommand';

// 注册内置命令
[...builtinCommands, ...extendedCommands, ...agentCommands, ...interviewCommands, ...planCommands, ...sparkCommands, ...sparkToTaskCommands].forEach((command) => {
    commandRegistry.register(command);
});

export { commandRegistry } from './registry';
export { type CommandResult, type CommandContext, type CommandDefinition, type CommandSuggestion } from './types';
