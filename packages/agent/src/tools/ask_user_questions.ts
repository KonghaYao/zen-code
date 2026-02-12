/**
 * ask_user_questions Tool
 *
 * Backend implementation for user question interaction.
 * This tool is interrupted by the frontend UI, then resumed with user input.
 */

import { z } from 'zod';
import { tool, Tool } from 'langchain';

/**
 * 选项 Schema
 */
const OptionSchema = z.object({
    label: z.string().min(1).max(50).describe('选项显示文本，简洁明了（1-50 字符）'),
});

/**
 * 完整参数 Schema
 */
export const AskUserQuestionsSchema = z.object({
    description: z.string().min(1).describe('向用户提出的问题，清晰具体，包含必要的上下文'),
    type: z.enum(['single_select', 'multi_select']).describe('选择类型：single_select（单选）或 multi_select（多选）'),
    options: z.array(OptionSchema).min(2).max(6).describe('选项列表，至少 2 个，最多 6 个'),
    allow_custom_input: z.boolean().default(true).describe('是否允许用户输入自定义文本，默认 true'),
    placeholder: z.string().optional().describe('自定义输入框的占位符文本'),
});

export type AskUserQuestionsParams = z.infer<typeof AskUserQuestionsSchema>;

/**
 * Default instance
 */
export const ask_user_questions_tool = tool(() => {}, {
    name: 'ask_user_questions',
    description: 'Ask the user a question with selectable options',
    schema: AskUserQuestionsSchema,
});
