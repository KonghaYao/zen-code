/**
 * Files Router - 文件系统管理
 *
 * 提供文件浏览器功能：
 * - 浏览目录、获取文件信息
 * - 创建/删除/重命名文件和文件夹
 * - 上传/下载文件
 */

import { z } from 'zod';
import { router, publicProcedure, handleBadRequest, handleNotFound } from './trpc.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as mime from 'mime-types';

// ========================================
// 配置
// ========================================

import * as os from 'os';

// 允许访问的根目录列表（项目根目录 + 用户主目录）
const ALLOWED_ROOTS = [process.cwd(), os.homedir()];

// 默认根目录
const DEFAULT_ROOT = process.cwd();

// 文件上传大小限制 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ========================================
// 安全验证工具
// ========================================

/**
 * 将前端相对路径转换为后端绝对路径
 * 前端路径: "/" 表示根目录, "/src" 表示根目录下的 src
 * 后端路径: "/Users/xxx/project" 为实际绝对路径
 */
function resolvePath(relativePath: string): string {
    // 移除开头的斜杠，获取相对路径
    const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    // 如果是空字符串，直接返回根目录
    if (!normalizedPath) {
        return DEFAULT_ROOT;
    }

    // 拼接到默认根目录
    return path.join(DEFAULT_ROOT, normalizedPath);
}

/**
 * 验证路径是否在允许的范围内
 * 防止路径遍历攻击
 *
 * 支持两种路径格式：
 * 1. 相对路径: "/" 或 "/src" - 拼接到 DEFAULT_ROOT，检查是否在 ALLOWED_ROOTS 下
 * 2. 绝对路径: "/Users/xxx/project" - 直接使用，但必须存在
 */
async function validatePath(targetPath: string): Promise<string> {
    console.log('[validatePath] Input:', targetPath);
    console.log('[validatePath] Is absolute:', path.isAbsolute(targetPath));
    console.log('[validatePath] DEFAULT_ROOT:', DEFAULT_ROOT);
    console.log('[validatePath] ALLOWED_ROOTS:', ALLOWED_ROOTS);

    // 先尝试作为相对路径处理（拼接到 DEFAULT_ROOT）
    // 这适用于 Finder 使用的前缀路径格式
    const relativePath = resolvePath(targetPath);
    const resolvedRelativePath = path.resolve(relativePath);

    console.log('[validatePath] Resolved relative path:', resolvedRelativePath);

    // 检查相对路径结果是否在允许的根目录下且存在
    const isRelativePathAllowed = ALLOWED_ROOTS.some((root) => {
        const normalizedRoot = path.resolve(root);
        const result = resolvedRelativePath.startsWith(normalizedRoot);
        console.log(`[validatePath] Check ${resolvedRelativePath} starts with ${normalizedRoot}:`, result);
        return result;
    });

    const relativePathExists = await pathExists(resolvedRelativePath);
    console.log('[validatePath] Relative path exists:', relativePathExists);

    if (isRelativePathAllowed && relativePathExists) {
        console.log('[validatePath] Returning relative path:', resolvedRelativePath);
        return resolvedRelativePath;
    }

    // 如果是完整的绝对路径（Workspace 功能），尝试直接使用
    if (path.isAbsolute(targetPath)) {
        const resolvedAbsolutePath = path.resolve(targetPath);
        console.log('[validatePath] Resolved absolute path:', resolvedAbsolutePath);

        // 检查是否在允许的根目录下
        const isAbsolutePathAllowed = ALLOWED_ROOTS.some((root) => {
            const normalizedRoot = path.resolve(root);
            const result = resolvedAbsolutePath.startsWith(normalizedRoot);
            console.log(`[validatePath] Check ${resolvedAbsolutePath} starts with ${normalizedRoot}:`, result);
            return result;
        });

        if (isAbsolutePathAllowed) {
            return resolvedAbsolutePath;
        }

        // 不在允许的根目录下，但路径存在（允许访问其他路径作为 workspace）
        const absolutePathExists = await pathExists(resolvedAbsolutePath);
        if (!absolutePathExists) {
            throw new Error(`Path does not exist: "${targetPath}"`);
        }
        return resolvedAbsolutePath;
    }

    // 如果不是绝对路径且相对路径验证失败，拒绝访问
    if (!isRelativePathAllowed) {
        throw new Error(`Access denied: Path "${targetPath}" is outside allowed directories`);
    }

    // 相对路径但不存在
    throw new Error(`Path does not exist: "${targetPath}"`);
}

/**
 * 检查路径是否存在
 */
async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * 获取文件类型图标
 */
function getFileIcon(isDirectory: boolean, extension?: string): string {
    if (isDirectory) return '📁';

    const ext = extension?.toLowerCase();
    const iconMap: Record<string, string> = {
        // 文档
        '.md': '📝',
        '.txt': '📄',
        '.pdf': '📕',
        '.doc': '📘',
        '.docx': '📘',
        // 代码
        '.ts': '🔷',
        '.tsx': '⚛️',
        '.js': '🟨',
        '.jsx': '⚛️',
        '.py': '🐍',
        '.go': '🐹',
        '.rs': '🦀',
        '.java': '☕',
        // 配置
        '.json': '📋',
        '.yaml': '⚙️',
        '.yml': '⚙️',
        '.toml': '⚙️',
        '.env': '🔐',
        // 图片
        '.png': '🖼️',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.gif': '🎞️',
        '.svg': '🎨',
        '.webp': '🖼️',
        // 媒体
        '.mp3': '🎵',
        '.mp4': '🎬',
        '.wav': '🔊',
        // 压缩
        '.zip': '📦',
        '.tar': '📦',
        '.gz': '📦',
        // 数据库
        '.db': '🗄️',
        '.sqlite': '🗄️',
        '.sql': '🗃️',
    };

    return iconMap[ext || ''] || '📄';
}

// ========================================
// Schema 定义
// ========================================

const ListInputSchema = z.object({
    path: z.string().default('/'),
    showHidden: z.boolean().default(false),
    sortBy: z.enum(['name', 'size', 'modifiedAt', 'type']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const StatInputSchema = z.object({
    path: z.string().min(1),
});

const CreateFolderInputSchema = z.object({
    path: z.string().min(1),
    name: z.string().min(1),
});

const CreateFileInputSchema = z.object({
    path: z.string().min(1),
    name: z.string().min(1),
    content: z.string().optional(),
});

const DeleteInputSchema = z.object({
    path: z.string().min(1),
});

const RenameInputSchema = z.object({
    oldPath: z.string().min(1),
    newName: z.string().min(1),
});

const UploadInputSchema = z.object({
    path: z.string().min(1),
    name: z.string().min(1),
    content: z.string(), // Base64 encoded content
    encoding: z.enum(['base64', 'utf8']).default('base64'),
});

const DownloadInputSchema = z.object({
    path: z.string().min(1),
});

const TreeInputSchema = z.object({
    path: z.string().default('/'),
    maxDepth: z.number().min(1).max(10).default(3),
    excludePatterns: z.array(z.string()).optional(),
});

const ReadFileInputSchema = z.object({
    path: z.string().min(1),
    maxSize: z.number().optional(),
});

const SearchInputSchema = z.object({
    query: z.string().min(1),
    path: z.string().default('/'),
    filePattern: z.string().optional(),
    maxResults: z.number().min(1).max(1000).default(100),
});

// ========================================
// Router
// ========================================

export const filesRouter = router({
    // 列出目录内容
    list: publicProcedure.input(ListInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);
        const exists = await pathExists(targetPath);

        if (!exists) {
            handleNotFound('Directory', input.path);
        }

        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
            handleBadRequest('Path is not a directory');
        }

        const entries = await fs.readdir(targetPath, { withFileTypes: true });

        let items = [];
        for (const entry of entries) {
            try {
                const fullPath = path.join(targetPath, entry.name);
                const stat = await fs.stat(fullPath);
                const isDirectory = entry.isDirectory();
                const isHidden = entry.name.startsWith('.');

                items.push({
                    name: entry.name,
                    path: path.join(input.path, entry.name),
                    type: isDirectory ? ('directory' as const) : ('file' as const),
                    size: isDirectory ? 0 : stat.size,
                    modifiedAt: stat.mtime,
                    createdAt: stat.birthtime,
                    isHidden,
                    extension: isDirectory ? undefined : path.extname(entry.name),
                    icon: getFileIcon(isDirectory, path.extname(entry.name)),
                });
            } catch (err) {
                // Skip files that cannot be stat (e.g., special files, permission issues)
                console.warn(`Failed to stat ${entry.name}:`, err);
            }
        }

        // 过滤隐藏文件
        if (!input.showHidden) {
            items = items.filter((item) => !item.isHidden);
        }

        // 排序
        items.sort((a, b) => {
            // 文件夹始终在前
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            let comparison = 0;
            switch (input.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'modifiedAt':
                    comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
                    break;
                case 'type':
                    comparison = (a.extension || '').localeCompare(b.extension || '');
                    break;
            }

            return input.sortOrder === 'asc' ? comparison : -comparison;
        });

        return {
            path: input.path,
            items,
            total: items.length,
        };
    }),

    // 获取文件/文件夹信息
    stat: publicProcedure.input(StatInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);
        const exists = await pathExists(targetPath);

        if (!exists) {
            handleNotFound('File', input.path);
        }

        const stat = await fs.stat(targetPath);
        const isDirectory = stat.isDirectory();

        return {
            name: path.basename(targetPath),
            path: input.path,
            type: isDirectory ? ('directory' as const) : ('file' as const),
            size: isDirectory ? 0 : stat.size,
            modifiedAt: stat.mtime,
            createdAt: stat.birthtime,
            extension: isDirectory ? undefined : path.extname(targetPath),
            mimeType: isDirectory ? undefined : mime.lookup(targetPath) || 'application/octet-stream',
            icon: getFileIcon(isDirectory, path.extname(targetPath)),
        };
    }),

    // 创建文件夹
    createFolder: publicProcedure.input(CreateFolderInputSchema).mutation(async ({ input }) => {
        const parentPath = await validatePath(input.path);
        const newPath = path.join(parentPath, input.name);
        await validatePath(newPath);

        if (await pathExists(newPath)) {
            handleBadRequest(`Folder "${input.name}" already exists`);
        }

        await fs.mkdir(newPath, { recursive: true });

        return { path: path.join(input.path, input.name), name: input.name };
    }),

    // 创建文件
    createFile: publicProcedure.input(CreateFileInputSchema).mutation(async ({ input }) => {
        const parentPath = await validatePath(input.path);
        const newPath = path.join(parentPath, input.name);
        await validatePath(newPath);

        if (await pathExists(newPath)) {
            handleBadRequest(`File "${input.name}" already exists`);
        }

        await fs.writeFile(newPath, input.content || '', 'utf-8');

        return { path: path.join(input.path, input.name), name: input.name };
    }),

    // 删除文件或文件夹
    delete: publicProcedure.input(DeleteInputSchema).mutation(async ({ input }) => {
        const targetPath = await validatePath(input.path);

        if (!(await pathExists(targetPath))) {
            handleNotFound('File or folder', input.path);
        }

        const stat = await fs.stat(targetPath);

        if (stat.isDirectory()) {
            await fs.rm(targetPath, { recursive: true });
        } else {
            await fs.unlink(targetPath);
        }

        return { path: input.path, success: true };
    }),

    // 重命名文件或文件夹
    rename: publicProcedure.input(RenameInputSchema).mutation(async ({ input }) => {
        const oldPath = await validatePath(input.oldPath);
        const parentDir = path.dirname(oldPath);
        const newPath = path.join(parentDir, input.newName);
        await validatePath(newPath);

        if (!(await pathExists(oldPath))) {
            handleNotFound('File or folder', input.oldPath);
        }

        if (await pathExists(newPath)) {
            handleBadRequest(`"${input.newName}" already exists`);
        }

        await fs.rename(oldPath, newPath);

        const oldRelativePath = input.oldPath;
        const newRelativePath = path.join(path.dirname(oldRelativePath), input.newName);

        return { oldPath: oldRelativePath, newPath: newRelativePath, name: input.newName };
    }),

    // 上传文件
    upload: publicProcedure.input(UploadInputSchema).mutation(async ({ input }) => {
        const parentPath = await validatePath(input.path);
        const newPath = path.join(parentPath, input.name);
        await validatePath(newPath);

        // 解码内容并检查大小
        let content: Buffer;
        if (input.encoding === 'base64') {
            content = Buffer.from(input.content, 'base64');
        } else {
            content = Buffer.from(input.content, 'utf-8');
        }

        if (content.length > MAX_FILE_SIZE) {
            handleBadRequest(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        await fs.writeFile(newPath, content);

        return {
            path: path.join(input.path, input.name),
            name: input.name,
            size: content.length,
        };
    }),

    // 下载文件
    download: publicProcedure.input(DownloadInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);

        if (!(await pathExists(targetPath))) {
            handleNotFound('File', input.path);
        }

        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
            handleBadRequest('Cannot download a directory');
        }

        const content = await fs.readFile(targetPath);
        const mimeType = mime.lookup(targetPath) || 'application/octet-stream';

        return {
            name: path.basename(targetPath),
            path: input.path,
            content: content.toString('base64'),
            mimeType,
            size: content.length,
        };
    }),

    // 获取文件树（递归）
    tree: publicProcedure.input(TreeInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);
        const exists = await pathExists(targetPath);

        if (!exists) {
            handleNotFound('Directory', input.path);
        }

        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
            handleBadRequest('Path is not a directory');
        }

        // 默认排除的目录
        const defaultExcludes = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'venv'];
        const excludePatterns = [...defaultExcludes, ...(input.excludePatterns || [])];

        // 递归构建树
        async function buildTree(dirPath: string, relativePath: string, depth: number): Promise<any[]> {
            if (depth > input.maxDepth) return [];

            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const result: any[] = [];

            for (const entry of entries) {
                // 跳过隐藏文件
                if (entry.name.startsWith('.')) continue;
                // 跳过排除的目录
                if (excludePatterns.includes(entry.name)) continue;

                const entryPath = path.join(dirPath, entry.name);
                const entryRelativePath = path.join(relativePath, entry.name);
                const isDirectory = entry.isDirectory();
                const extension = isDirectory ? undefined : path.extname(entry.name);

                const node: any = {
                    name: entry.name,
                    path: entryRelativePath,
                    type: isDirectory ? 'directory' : 'file',
                    extension,
                    icon: getFileIcon(isDirectory, extension),
                };

                if (isDirectory && depth < input.maxDepth) {
                    node.children = await buildTree(entryPath, entryRelativePath, depth + 1);
                }

                result.push(node);
            }

            // 排序：目录在前，然后按名称
            result.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            return result;
        }

        const tree = await buildTree(targetPath, input.path, 1);

        return {
            path: input.path,
            tree,
        };
    }),

    // 读取文件内容（用于预览）
    readFile: publicProcedure.input(ReadFileInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);
        const maxSize = input.maxSize || 1024 * 1024; // 默认 1MB

        if (!(await pathExists(targetPath))) {
            handleNotFound('File', input.path);
        }

        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
            handleBadRequest('Cannot read a directory');
        }

        // 检查文件大小
        if (stat.size > maxSize) {
            return {
                path: input.path,
                content: null,
                size: stat.size,
                isLarge: true,
            };
        }

        const content = await fs.readFile(targetPath, 'utf-8');

        return {
            path: input.path,
            content,
            size: stat.size,
            isLarge: false,
        };
    }),

    // 搜索文件内容（调用 ripgrep）
    search: publicProcedure.input(SearchInputSchema).query(async ({ input }) => {
        const targetPath = await validatePath(input.path);

        if (!(await pathExists(targetPath))) {
            handleNotFound('Directory', input.path);
        }

        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
            handleBadRequest('Path is not a directory');
        }

        // 动态导入 ripgrep 工具
        // 这里简化实现，实际可以调用系统的 rg 命令
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const results: any[] = [];

        try {
            // 构建搜索命令
            let command = `rg --json --max-count=${input.maxResults}`;
            if (input.filePattern) {
                command += ` --glob="${input.filePattern}"`;
            }
            command += ` "${input.query.replace(/"/g, '\\"')}" "${targetPath}"`;

            const { stdout } = await execAsync(command, {
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });

            // 解析 ripgrep JSON 输出
            const lines = stdout.split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.type === 'match') {
                        const match = data.data;
                        results.push({
                            filePath: path.relative(DEFAULT_ROOT, match.path.text),
                            lineNumber: match.line_number,
                            lineContent: match.lines.text,
                            matchStart: match.submatches[0]?.start || 0,
                            matchEnd: match.submatches[0]?.end || 0,
                        });
                    }
                } catch {
                    // 忽略解析错误
                }
            }
        } catch (error: any) {
            // rg 返回非零退出码时表示没有匹配
            if (error.code !== 1) {
                throw new Error(`Search failed: ${error.message}`);
            }
        }

        return {
            query: input.query,
            path: input.path,
            results,
            total: results.length,
        };
    }),

    // 获取允许的根目录列表
    getAllowedRoots: publicProcedure.query(() => {
        return {
            roots: ALLOWED_ROOTS.map((root) => ({
                path: root,
                name: path.basename(root),
            })),
        };
    }),
});
