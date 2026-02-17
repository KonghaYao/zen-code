/**
 * Memory-clear Command 实现进入记忆整理模式，清理、合并和优化 .claude/memories 文件夹
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';

const MEMORY_PREFIX = `
[Memory Organization Mode Activated]

I want to organize and manage the .claude/memories folder.

**Your Role:** You are in Memory Organization Mode - analyze, organize, and maintain the project memory files in .claude/memories/.

**Process:**
1. Read all memory files in .claude/memories/ directory
2. Analyze the structure and identify issues:
   - Duplicate or overlapping memories
   - Outdated or irrelevant content
   - Poorly organized categories
   - Missing or inconsistent metadata
3. Propose and execute organization actions:
   - Merge related memories
   - Update outdated information
   - Improve categorization and tags
   - Remove or archive obsolete memories
   - Improve file naming consistency
4. Generate a summary report of changes made

**Memory File Format:**
- Each memory is a directory with MEMORY.md file
- MEMORY.md contains YAML frontmatter + Markdown content
- Frontmatter fields: name, description, tags, category, created, last_updated, priority, context_scope

**Evaluation Criteria for Keeping/Merging:**
- **Relevance**: Is this still applicable to the project?
- **Accuracy**: Is the information still correct?
- **Uniqueness**: Does this duplicate other memories?
- **Completeness**: Is the information sufficient?

**Categories:**
- architecture: 架构决策、设计模式、系统结构
- bug-fix: Bug 修复和问题解决方案
- workflow: 工作流程和最佳实践
- configuration: 配置和环境设置
- optimization: 性能优化和改进

**Priority Levels:**
- high: 关键架构决策、重要问题解决方案
- medium: 有用的模式、次要配置信息
- low: 一般性建议、参考信息

**Output Format:**
Provide a detailed report of:
- Current state of memories (count by category)
- Issues identified
- Actions taken (merged, updated, removed, archived)
- Recommendations for future memory maintenance

---

`;

export const memoryClearCommand: CommandDefinition = {
    name: 'memory-clear',
    description: '整理 .claude/memories 文件夹，清理、合并和优化项目记忆',
    aliases: ['mem-clean', 'clean-memory'],
    usage: '/memory-clear',
    execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
        const userRequest = args.join(' ').trim();
        const enhancedMessage =
            MEMORY_PREFIX + (userRequest ? `Additional context: ${userRequest}\n\n---` : '开始整理记忆文件夹。');

        context.sendMessage(
            [
                {
                    type: 'human',
                    content: enhancedMessage,
                },
            ],
            { extraParams: context.extraParams },
        );

        return {
            success: true,
            message: '🧠 记忆整理模式已激活 - 正在分析 .claude/memories 文件夹...',
            shouldClearInput: true,
        };
    },
};

export const memoryCommands: CommandDefinition[] = [memoryClearCommand];
