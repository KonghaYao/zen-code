/**
 * Spark Command - 快速添加灵感到 Spark List
 */

import { CommandContext, CommandDefinition, CommandResult } from './types';
import { SparkStoreManager } from '@codegraph/config';

// 获取项目根目录
function getProjectRoot(): string {
  return process.cwd();
}

// 从文本中提取 tags (#tag 格式)
function extractTags(text: string): string[] {
  const tagRegex = /#(\w+)/g;
  const tags = new Set<string>();
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

// 移除文本中的 tags，获得干净的描述
function removeTags(text: string): string {
  return text.replace(/#\w+/g, '').trim();
}

// 生成标题 (使用第一行或前 50 个字符)
function generateTitle(text: string): string {
  const lines = text.split('\n');
  const firstLine = lines[0].trim();

  if (firstLine.length > 50) {
    return firstLine.substring(0, 47) + '...';
  }

  return firstLine || 'Untitled Spark';
}

export const sparkCommand: CommandDefinition = {
  name: 'spark',
  description: 'Add an idea/spark to the Spark List',
  aliases: ['s'],
  usage: '/spark <text> [#tag1 #tag2]',
  requiresArgs: true,
  execute: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const userRequest = args.join(' ').trim();

    if (!userRequest) {
      return {
        success: false,
        message: '❌ 需要提供文本内容\n用法: /spark <text> [#tag1 #tag2]',
      };
    }

    try {
      // 提取 tags
      const tags = extractTags(userRequest);
      const cleanText = removeTags(userRequest);

      // 生成标题和描述
      const title = generateTitle(cleanText);
      const description = cleanText;

      // 创建 SparkStoreManager 并添加 spark
      const store = new SparkStoreManager(getProjectRoot());
      await store.initialize();

      const spark = await store.addSpark({
        type: 'idea',
        title,
        description,
        priority: 'medium',
        tags,
      });

      return {
        success: true,
        message: `✨ Spark added!\n\n📌 ${spark.title}\n🏷️ ${tags.length > 0 ? tags.join(', ') : 'no tags'}\n📝 ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Failed to add spark: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const sparkCommands: CommandDefinition[] = [sparkCommand];
