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
// NEW: Import create-agent-md commands
import { createAgentMdCommands } from './createAgentMdCommand';

// NEW: Import compact mode command
import { compactCommand } from './compactCommand';

// NEW: Import MCP panel command
import { mcpPanelCommand } from './mcpCommand';

// NEW: Import Settings panel command
import { settingsCommand } from './settingsCommand';

// NEW: Import Memory-clear command
import { memoryCommands } from './memoryClearCommand';

// 注册内置命令
[
    ...builtinCommands,
    ...extendedCommands,
    ...agentCommands,
    ...interviewCommands,
    ...planCommands,
    ...createAgentMdCommands,
    ...memoryCommands,
    compactCommand,
    mcpPanelCommand,
    settingsCommand,
].forEach((command) => {
    commandRegistry.register(command);
});

export { commandRegistry } from './registry';
export { type CommandResult, type CommandContext, type CommandDefinition, type CommandSuggestion } from './types';
