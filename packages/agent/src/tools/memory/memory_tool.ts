import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MemoryStorage } from './storage_layer';

/**
 * 添加记忆到记忆文件中
 */
export const add_memory_tool = tool(
    async ({ content, tags }) => {
        try {
            const storage = new MemoryStorage();

            // 使用存储层添加记忆
            await storage.add({
                content,
                tags,
                timestamp: new Date().toISOString(),
            });

            return `记忆已成功添加到 ${storage.getFilePath()}`;
        } catch (error: any) {
            return `添加记忆时出错: ${error.message}`;
        }
    },
    {
        name: 'add_memory',
        description: `保存重要信息供未来参考。用于记录项目中的关键信息、解决方案或经验。

何时使用：
- 用户要求记住某些信息
- 解决了复杂问题，值得记录供日后参考
- 发现了项目的重要模式或约定
- 需要记录特殊配置或决策的原因

使用建议：
- content 应该是清晰完整的描述，包含关键信息和上下文
- 使用合适的标签（tags）来分类和组织记忆
- content 支持 Markdown 格式，可以包含代码片段

查询已有记忆：
- 使用 query_memory 工具搜索记忆内容
- 可以通过关键词、标签或全文搜索来查找相关的历史记忆`,
        schema: z.object({
            content: z.string().describe('记忆内容，包含完整的描述和上下文（支持 Markdown）'),
            tags: z
                .array(z.string())
                .describe('标签数组，用于分类和组织记忆（如 ["skill-creation", "documentation"]）'),
        }),
    },
);

/**
 * 查询记忆文件中的内容
 */
export const query_memory_tool = tool(
    async ({ keyword, search_type, head_limit }) => {
        try {
            const storage = new MemoryStorage();

            // 使用存储层进行搜索
            const result = await storage.search({
                keyword,
                searchType: search_type,
                headLimit: head_limit,
            });

            return result;
        } catch (error: any) {
            return `查询记忆时出错: ${error.message}`;
        }
    },
    {
        name: 'query_memory',
        description: `查询记忆文件中的内容。用于查找之前记录的重要信息、解决方案或经验。

何时使用：
- 需要查找之前记录的项目信息
- 想要回顾历史解决方案
- 需要搜索特定主题的记忆内容

搜索类型：
- "tags": 只在标签中搜索（适合按分类查找）
- "content": 只在内容中搜索（默认，适合查找具体信息）
- "full": 在标签和内容中搜索（最全面，可能返回更多结果）

使用建议：
- 使用关键词来缩小搜索范围
- 如果不提供关键词，会返回所有记忆内容
- 可以使用 head_limit 限制输出行数以提高性能`,
        schema: z.object({
            description: z.string().optional().describe('what you want to do'),
            keyword: z.string().optional().describe('搜索关键词，留空则返回所有记忆'),
            search_type: z
                .enum(['tags', 'content', 'full'])
                .default('content')
                .describe('搜索类型：tags=标签搜索，content=内容搜索，full=全文搜索'),
            head_limit: z.number().optional().describe('限制输出行数，用于性能优化（默认不限制）'),
        }),
    },
);
