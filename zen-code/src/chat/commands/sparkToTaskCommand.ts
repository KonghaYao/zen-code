/**
 * Spark to Task Command - 将 Sparks 转换为任务计划
 * 按照 Design Mode 规则执行
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';
import { SparkStoreManager } from '@codegraph/config';
import { join } from 'path';

// 获取项目根目录
function getProjectRoot(): string {
  return process.cwd();
}

// 获取 skill 文件路径
function getSkillPath(skillName: string): string {
  return join(getProjectRoot(), '.claude', 'skills', skillName, 'SKILL.md');
}

// 格式化 Sparks 为文本
function formatSparks(sparks: any[]): string {
  if (sparks.length === 0) {
    return 'No sparks found.';
  }

  const grouped = {
    idea: sparks.filter(s => s.type === 'idea'),
    bug_report: sparks.filter(s => s.type === 'bug_report'),
    feature: sparks.filter(s => s.type === 'feature'),
    refactor: sparks.filter(s => s.type === 'refactor'),
  };

  let output = `## Spark List (${sparks.length} items)\n\n`;

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;

    const typeLabel = {
      idea: '💡 Ideas',
      bug_report: '🐛 Bug Reports',
      feature: '✨ Features',
      refactor: '🔧 Refactors',
    }[type];

    output += `### ${typeLabel} (${items.length})\n\n`;

    items.forEach((spark, index) => {
      const mapper: Record<string, string> = {
        low: '⚪',
        medium: '🟡',
        high: '🟠',
        critical: '🔴',
      }
      const priorityIcon: string = mapper[spark.priority];

      const tags = spark.tags.length > 0 ? ` ${spark.tags.map((t: string) => `#${t}`).join(' ')}` : '';

      output += `${index + 1}. ${priorityIcon} **${spark.title}**${tags}\n`;
      output += `   - ID: \`${spark.id}\`\n`;
      output += `   - Description: ${spark.description}\n`;
      output += `   - Created: ${new Date(spark.createdAt).toLocaleString()}\n\n`;
    });
  }

  return output;
}

const SPARK_TO_TASK_PREFIX = `
[Design Mode Activated - Spark to Task]

I want to convert Sparks into actionable implementation plans following the Design Mode workflow.

**Your Role:** You are in Design Mode - help me transform sparks into detailed tasks.

**Design Mode Workflow:**

1. **Spark List Analysis** - Review all pending sparks below
2. **Plan Mode Selection** - For each spark, choose appropriate approach:
   - **Brain Storm** - For exploring multiple solution approaches
   - **Production Drawing** - For implementation-ready features
   - **BUG Analyze** - For bug reports (root cause, reproduction, fix strategy)
   - **Spec Writing** - For complex requirements

3. **Task Review** - Ensure tasks follow these principles:
   - **Bite-Sized**: Each step is 2-5 minutes of work
   - **TDD**: Write test → Verify fail → Implement → Verify pass → Commit
   - **DRY/YAGNI**: Don't repeat yourself, aren't gonna need it
   - **Exact Paths**: Always specify exact file paths
   - **Complete Code**: Include full code snippets, not "add validation"

**Output Format:**

For each selected spark, create a plan using the writing-plans skill template:
- Save to \`docs/plans/YYYY-MM-DD-<feature-name>.md\`
- Follow the exact structure shown in the skill
- Include the required header: Goal, Architecture, Tech Stack
- Break down into bite-sized tasks with files, code, commands

---

`;

export const sparkToTaskCommand: CommandDefinition = {
  name: 'spark-to-task',
  description: 'Convert sparks to actionable implementation plans',
  aliases: ['stt'],
  usage: '/spark-to-task',
  requiresArgs: false,
  execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    try {
      // 1. 查询 pending sparks
      const store = new SparkStoreManager(getProjectRoot());
      await store.initialize();
      const sparks = await store.getSparksByStatus('pending');

      if (sparks.length === 0) {
        return {
          success: false,
          message: '❌ No pending sparks found. Use /spark to add some ideas first!',
        };
      }

      // 2. 格式化 sparks
      const sparksText = formatSparks(sparks);
      // 4. 构建多个 message
      const messages = [
        {
          type: 'human' as const,
          content: SPARK_TO_TASK_PREFIX.trim(),
        },

        {
          type: 'human' as const,
          content: sparksText,
        },
        {
          type: 'human' as const,
          content: `**Your Task:**
1. Review the sparks above
2. pickup some sparks and combine them into one THEME
3. Use Plan Skills and enter plan mode.
4. in plan mode, you will output some documents about this THEME.
5. Use add_task to record in the task system.
6. update ./claude/sparks.json`,
        },
      ];

      context.sendMessage(messages, { extraParams: context.extraParams });

      return {
        success: true,
        message: `📋 Design Mode activated with ${sparks.length} spark(s)`,
        shouldClearInput: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to activate Design Mode: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const sparkToTaskCommands: CommandDefinition[] = [sparkToTaskCommand];
