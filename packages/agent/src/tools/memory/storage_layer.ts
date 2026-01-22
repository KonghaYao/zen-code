import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// 静态变量：记忆文件位置
const MEMORY_DIR = '.langgraph_api';
const MEMORY_FILE = 'memory.md';

export const MemoryEntrySchema = z.object({
    content: z.string(),
    tags: z.array(z.string()),
    timestamp: z.string(),
});

/**
 * 记忆条目接口
 */
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

/**
 * 抽象存储层 - 负责所有解析和存储逻辑
 */
export class MemoryStorage {
    private memoryDir: string;
    private memoryFile: string;

    constructor(dir: string = MEMORY_DIR, file: string = MEMORY_FILE) {
        this.memoryDir = path.join(process.cwd(), dir);
        this.memoryFile = path.join(this.memoryDir, file);
    }

    /**
     * 确保记忆文件和目录存在
     */
    private async ensureStorage(): Promise<void> {
        await fs.mkdir(this.memoryDir, { recursive: true });

        // 确保文件存在，如果不存在则创建空文件
        try {
            await fs.access(this.memoryFile);
        } catch {
            await fs.writeFile(this.memoryFile, '', 'utf-8');
        }
    }

    /**
     * 解析记忆文件内容为记忆条目数组
     */
    private parseContent(content: string): MemoryEntry[] {
        const entries: MemoryEntry[] = [];
        // 修改分隔符以匹配新的序列化格式（可能有多个空行）
        const blocks = content.split(/\n+---\n/).filter((block) => block.trim());

        for (const block of blocks) {
            const lines = block.split('\n');
            let timestamp = '';
            let tags: string[] = [];
            const contentLines: string[] = [];
            let metadataEnded = false;

            for (const line of lines) {
                const trimmedLine = line.trim();

                // 跳过空行，直到元数据结束
                if (!metadataEnded && trimmedLine === '') {
                    continue;
                }

                // 解析时间戳
                if (line.startsWith('**时间**:') || line.startsWith('timestamp:')) {
                    const value = line.split(':').slice(1).join(':').trim();
                    timestamp = value;
                    continue;
                }

                // 解析标签
                if (line.startsWith('**标签**:') || line.startsWith('tags:')) {
                    const value = line.split(':').slice(1).join(':').trim();
                    tags = value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean);
                    continue;
                }

                // 跳过旧格式的标题标记（兼容性）
                if (line.startsWith('## ')) {
                    metadataEnded = true;
                    // 将标题内容作为正文的一部分
                    contentLines.push(line.substring(3).trim());
                    continue;
                }

                // 如果已经有时间戳和标签，且遇到非元数据行，则进入内容区
                if (timestamp && tags.length > 0 && !line.startsWith('**')) {
                    metadataEnded = true;
                }

                // 收集内容
                if (metadataEnded) {
                    contentLines.push(line);
                }
            }

            // 验证并添加条目
            const contentStr = contentLines.join('\n').trim();
            if (contentStr && timestamp) {
                entries.push({
                    content: contentStr,
                    tags: tags,
                    timestamp: timestamp,
                });
            }
        }

        return entries;
    }

    /**
     * 将记忆条目序列化为文本格式
     */
    private serializeEntry(entry: MemoryEntry): string {
        const parts: string[] = [];

        parts.push('');
        parts.push('---');
        parts.push('');
        parts.push(`**时间**: ${entry.timestamp}`);
        parts.push('');
        parts.push(`**标签**: ${entry.tags.join(', ')}`);
        parts.push('');
        parts.push(entry.content);
        parts.push('');

        return parts.join('\n');
    }

    /**
     * 读取所有记忆条目
     */
    async readAll(): Promise<MemoryEntry[]> {
        try {
            await fs.access(this.memoryFile);
            const content = await fs.readFile(this.memoryFile, 'utf-8');
            return this.parseContent(content);
        } catch {
            return [];
        }
    }

    /**
     * 读取原始内容
     */
    async readRaw(): Promise<string> {
        try {
            await fs.access(this.memoryFile);
            return await fs.readFile(this.memoryFile, 'utf-8');
        } catch {
            return '';
        }
    }

    /**
     * 添加记忆条目
     */
    async add(entry: Omit<MemoryEntry, 'timestamp'> & { timestamp?: string }): Promise<void> {
        await this.ensureStorage();

        const fullEntry: MemoryEntry = {
            content: entry.content,
            tags: entry.tags,
            timestamp: entry.timestamp || new Date().toISOString(),
        };

        const serialized = this.serializeEntry(fullEntry);
        await fs.appendFile(this.memoryFile, serialized, 'utf-8');
    }

    /**
     * 搜索记忆条目
     */
    async search(options: {
        keyword?: string;
        searchType?: 'tags' | 'content' | 'full';
        headLimit?: number;
    }): Promise<string> {
        const { keyword, searchType = 'content', headLimit } = options;

        // 读取所有条目
        const entries = await this.readAll();

        if (entries.length === 0) {
            return '记忆文件不存在或为空，请先使用 add_memory 工具添加记忆。';
        }

        // 如果没有关键词，返回所有内容
        if (!keyword || keyword.trim() === '') {
            const raw = await this.readRaw();
            if (headLimit) {
                const lines = raw.split('\n');
                return lines.slice(0, headLimit).join('\n');
            }
            return raw;
        }

        // 过滤匹配的条目
        const keywordLower = keyword.toLowerCase();
        const filteredEntries = entries.filter((entry) => {
            if (searchType === 'tags') {
                return entry.tags.some((tag) => tag.toLowerCase().includes(keywordLower));
            } else if (searchType === 'content') {
                return entry.content.toLowerCase().includes(keywordLower);
            } else {
                // full search
                return (
                    entry.content.toLowerCase().includes(keywordLower) ||
                    entry.tags.some((tag) => tag.toLowerCase().includes(keywordLower))
                );
            }
        });

        if (filteredEntries.length === 0) {
            return `在记忆中未找到包含 "${keyword}" 的内容。`;
        }

        // 序列化匹配的条目
        let result = filteredEntries.map((entry) => this.serializeEntry(entry)).join('\n');

        // 应用行数限制
        if (headLimit) {
            const lines = result.split('\n');
            result = lines.slice(0, headLimit).join('\n');
        }

        return result;
    }

    /**
     * 获取记忆文件路径（用于外部工具）
     */
    getFilePath(): string {
        return this.memoryFile;
    }

    /**
     * 检查记忆文件是否存在
     */
    async exists(): Promise<boolean> {
        try {
            await fs.access(this.memoryFile);
            return true;
        } catch {
            return false;
        }
    }
}
