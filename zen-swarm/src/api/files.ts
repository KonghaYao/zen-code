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

// 允许访问的根目录列表（默认为项目根目录）
const ALLOWED_ROOTS = [process.cwd()];

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
 */
async function validatePath(targetPath: string): Promise<string> {
    // 将前端相对路径转换为绝对路径
    const absolutePath = resolvePath(targetPath);

    // 规范化路径，解析 .. 等
    const resolvedPath = path.resolve(absolutePath);

    // 检查是否在允许的根目录下
    const isAllowed = ALLOWED_ROOTS.some((root) => {
        const normalizedRoot = path.resolve(root);
        return resolvedPath.startsWith(normalizedRoot);
    });

    if (!isAllowed) {
        throw new Error(`Access denied: Path "${targetPath}" is outside allowed directories`);
    }

    return resolvedPath;
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

        let items = await Promise.all(
            entries.map(async (entry) => {
                const fullPath = path.join(targetPath, entry.name);
                const stat = await fs.stat(fullPath);
                const isDirectory = entry.isDirectory();
                const isHidden = entry.name.startsWith('.');

                return {
                    name: entry.name,
                    path: path.join(input.path, entry.name),
                    type: isDirectory ? ('directory' as const) : ('file' as const),
                    size: isDirectory ? 0 : stat.size,
                    modifiedAt: stat.mtime,
                    createdAt: stat.birthtime,
                    isHidden,
                    extension: isDirectory ? undefined : path.extname(entry.name),
                    icon: getFileIcon(isDirectory, path.extname(entry.name)),
                };
            }),
        );

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
