import { tool, ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { SwarmStateType } from '../../state';

export const write_tool = tool(
    async ({ file_path, content }, runtime: ToolRuntime<SwarmStateType>) => {
        try {
            // 解析路径：如果是相对路径，基于 cwd 解析；如果是绝对路径，直接使用
            const resolvedPath = resolve(runtime.state.cwd, file_path);
            await fs.writeFile(resolvedPath, content, 'utf-8');
            return `File ${resolvedPath} has been written successfully.`;
        } catch (error: any) {
            return `Error writing file: ${error.message}`;
        }
    },
    {
        name: 'write_file',
        description: `Writes a file to the local filesystem. Relative paths are resolved based on the current working directory (cwd).
Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
        schema: z.object({
            description: z.string().optional().describe('what you want to do'),
            file_path: z.string().describe('The path to the file to write (absolute or relative to cwd)'),
            content: z.string().describe('The content to write to the file'),
        }),
    },
);
