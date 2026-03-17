import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { write_tool } from '../write_tool.js';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// 模拟工具运行时
interface MockToolRuntime {
    state: {
        cwd: string;
    };
}

describe('write_tool', () => {
    let testDir: string;
    let runtime: MockToolRuntime;

    beforeEach(async () => {
        // 创建临时测试目录
        testDir = resolve(tmpdir(), `write-tool-test-${randomUUID()}`);
        await fs.mkdir(testDir, { recursive: true });

        // 设置运行时
        runtime = {
            state: {
                cwd: testDir,
            },
        };
    });

    afterEach(async () => {
        // 清理临时目录
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // 忽略清理错误
        }
    });

    describe('基本功能', () => {
        it('应该成功写入文件', async () => {
            const filePath = 'test.txt';
            const content = 'Hello, World!';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            // 验证文件内容
            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该正确处理绝对路径', async () => {
            const filePath = resolve(testDir, 'absolute-test.txt');
            const content = 'Absolute path test';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fileContent = await fs.readFile(filePath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该正确处理相对路径', async () => {
            const filePath = 'subdir/test.txt';
            const content = 'Relative path test';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该支持多行文本', async () => {
            const filePath = 'multiline.txt';
            const content = 'Line 1\nLine 2\nLine 3';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该支持特殊字符', async () => {
            const filePath = 'special.txt';
            const content = '中文测试 🎉 Special chars: @#$%^&*()';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该支持空字符串内容', async () => {
            const filePath = 'empty.txt';
            const content = '';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });
    });

    describe('覆盖行为', () => {
        it('应该覆盖已存在的文件', async () => {
            const filePath = 'overwrite.txt';
            const initialContent = 'Initial content';
            const newContent = 'Updated content';

            // 创建初始文件
            const initialPath = resolve(testDir, filePath);
            await fs.writeFile(initialPath, initialContent, 'utf-8');

            // 写入新内容
            const result = await write_tool.invoke({ file_path: filePath, content: newContent }, runtime as any);

            expect(result).toContain('has been written successfully');

            // 验证文件被覆盖
            const fileContent = await fs.readFile(initialPath, 'utf-8');
            expect(fileContent).toBe(newContent);
            expect(fileContent).not.toBe(initialContent);
        });
    });

    describe('错误处理', () => {
        it('应该在 cwd 未设置时抛出错误', async () => {
            const invalidRuntime = { state: {} };

            const result = await write_tool.invoke(
                { file_path: 'test.txt', content: 'content' },
                invalidRuntime as any,
            );

            expect(result).toContain('Error writing file');
            expect(result).toContain('cwd');
        });

        it('应该在写入到无效目录时返回错误', async () => {
            const invalidPath = '/nonexistent/directory/test.txt';
            const content = 'content';

            const result = await write_tool.invoke({ file_path: invalidPath, content }, runtime as any);

            expect(result).toContain('Error writing file');
        });
    });

    describe('参数验证', () => {
        it('应该支持 description 参数（可选）', async () => {
            const filePath = 'with-desc.txt';
            const content = 'content';
            const description = 'Test write operation';

            const result = await write_tool.invoke(
                {
                    file_path: filePath,
                    content,
                    description,
                },
                runtime as any,
            );

            expect(result).toContain('has been written successfully');
        });

        it('应该支持只有必需参数的调用', async () => {
            const filePath = 'minimal.txt';
            const content = 'content';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');
        });
    });

    describe('工具元数据', () => {
        it('应该有正确的名称', () => {
            expect(write_tool.name).toBe('write_file');
        });

        it('应该有描述', () => {
            expect(write_tool.description).toBeDefined();
            expect(write_tool.description).toContain('writes a file');
        });

        it('应该有 schema 定义', () => {
            expect(write_tool.schema).toBeDefined();
        });
    });

    describe('路径解析', () => {
        it('应该正确处理嵌套目录', async () => {
            const filePath = 'deep/nested/path/test.txt';
            const content = 'Nested directory test';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');

            const fullPath = resolve(testDir, filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it('应该处理包含 . 的相对路径', async () => {
            const filePath = './dot-prefix.txt';
            const content = 'Dot prefix test';

            const result = await write_tool.invoke({ file_path: filePath, content }, runtime as any);

            expect(result).toContain('has been written successfully');
        });
    });
});
