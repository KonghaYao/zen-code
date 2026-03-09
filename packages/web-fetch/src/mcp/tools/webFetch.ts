import { webFetch } from '../../extract.js';
import { ExtractSchema } from '../../extract.js';

export const webFetchTool = {
    definition: {
        name: 'webFetch',
        description: '批量抓取并提取网页内容，支持 HTML 转 Markdown、多平台清理、元数据提取等功能',
        inputSchema: {
            type: 'object',
            properties: {
                urls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '要抓取的 URL 列表',
                },
                format: {
                    type: 'string',
                    enum: ['markdown', 'text'],
                    description: '输出格式：markdown 或 text',
                },
                extract_depth: {
                    type: 'string',
                    enum: ['basic', 'advanced'],
                    description: '提取深度：basic 或 advanced',
                },
                include_images: {
                    type: 'boolean',
                    description: '是否提取图片链接',
                },
                include_favicon: {
                    type: 'boolean',
                    description: '是否提取 favicon',
                },
                timeout: {
                    type: 'number',
                    description: '超时秒数（1-60）',
                },
            },
            required: ['urls'],
        },
    },

    handler: async (params: unknown) => {
        try {
            // 使用 zod 验证参数
            const validatedParams = ExtractSchema.parse(params);

            // 调用现有 webFetch
            const result = await webFetch(validatedParams);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`参数验证失败: ${error.message}`);
            }
            throw new Error('处理请求时发生未知错误');
        }
    },
};
