import { tool, ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { SwarmStateType } from '../../state';

const folderOperationSchema = z
    .object({
        operation: z.enum(['create', 'list', 'exists']).describe('The folder operation to perform'),
        folder_path: z.string().describe('The path to the folder (absolute or relative to cwd)'),
        description: z.string().optional().describe('What you want to do'),
        recursive: z
            .boolean()
            .default(true)
            .optional()
            .describe('For create: create parent directories if they do not exist'),
    })
    .strict();

export const folder_tool = tool(
    async ({ operation, folder_path, recursive = true }, runtime: ToolRuntime<SwarmStateType>) => {
        try {
            // 解析路径：如果是相对路径，基于 cwd 解析；如果是绝对路径，直接使用
            const resolvedPath = resolve(runtime.state.cwd, folder_path);

            switch (operation) {
                case 'create': {
                    await fs.mkdir(resolvedPath, { recursive });
                    return `✓ Folder created successfully at: ${resolvedPath}`;
                }

                case 'exists': {
                    try {
                        await fs.access(resolvedPath);
                        const stats = await fs.stat(resolvedPath);
                        return `✓ Folder exists at: ${resolvedPath}\n  Type: ${stats.isDirectory() ? 'Directory' : 'File'}`;
                    } catch {
                        return `✗ Folder does not exist at: ${resolvedPath}`;
                    }
                }

                case 'list': {
                    try {
                        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

                        if (entries.length === 0) {
                            return `Folder is empty: ${resolvedPath}`;
                        }

                        const result: string[] = [];
                        result.push(`📁 ${resolvedPath}\n`);

                        const folders: string[] = [];
                        const files: string[] = [];

                        for (const entry of entries) {
                            const fullPath = join(resolvedPath, entry.name);
                            try {
                                const stats = await fs.stat(fullPath);
                                const size = stats.size;
                                const modified = stats.mtime.toLocaleDateString();
                                const icon = entry.isDirectory() ? '📁' : '📄';
                                const info = `${icon} ${entry.name}${entry.isDirectory() ? '/' : ''} (${size} bytes, ${modified})`;

                                if (entry.isDirectory()) {
                                    folders.push(info);
                                } else {
                                    files.push(info);
                                }
                            } catch (error) {
                                files.push(`⚠️ ${entry.name} (unreadable)`);
                            }
                        }

                        if (folders.length > 0) {
                            result.push('Directories:');
                            folders.forEach((f) => result.push(`  ${f}`));
                            result.push('');
                        }

                        if (files.length > 0) {
                            result.push('Files:');
                            files.forEach((f) => result.push(`  ${f}`));
                        }

                        result.push(`\nTotal: ${folders.length} directories, ${files.length} files`);
                        return result.join('\n');
                    } catch (error: any) {
                        if (error.code === 'ENOENT') {
                            return `✗ Folder not found: ${resolvedPath}`;
                        }
                        if (error.code === 'ENOTDIR') {
                            return `✗ Path exists but is not a folder: ${resolvedPath}`;
                        }
                        throw error;
                    }
                }

                default: {
                    return `✗ Unknown operation: ${operation}`;
                }
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `✗ Folder not found: ${folder_path}`;
            }
            if (error.code === 'EACCES') {
                return `✗ Permission denied: ${folder_path}`;
            }
            return `✗ Error: ${error.message}`;
        }
    },
    {
        name: 'folder_operations',
        description: `Unified folder operations tool supporting create, list, and existence check. Relative paths are resolved based on the current working directory (cwd).

**Operations:**
- create: Create a folder (supports nested directory creation)
- list: List all files and subdirectories with metadata
- exists: Check if a folder exists

**Usage Examples:**
- Create nested folders: {operation: "create", folder_path: "/path/to/nested/folder"}
- Create with relative path: {operation: "create", folder_path: "data/output"}
- List contents: {operation: "list", folder_path: "/path/to/folder"}
- List with relative path: {operation: "list", folder_path: "src"}
- Check existence: {operation: "exists", folder_path: "path/to/folder"}

**Important:**
- All folder paths can be absolute or relative to cwd
- Create operation is recursive (creates parent directories if needed)
- List operation shows file sizes and modification dates
- Delete operations are not supported for safety reasons. Use terminal commands with user approval if needed.`,
        schema: folderOperationSchema,
    },
);
