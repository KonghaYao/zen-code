import { tool, ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { rgPath } from '../../utils/ripgrep.js';
import { execa } from 'execa';
import { resolve } from 'path';
import type { BaseAgentStateType } from '../../index.js';

// 使用 execa 执行命令的异步函数
const execCommand = async (
    command: string,
    args: string[],
    options: { timeout?: number; cwd?: string } = {},
): Promise<{ code: number; stdout: string; stderr: string }> => {
    const { timeout = 15000, cwd } = options;

    try {
        // console.log('execCommand', command, args, cwd);
        const result = await execa(command, args, {
            cwd: cwd || process.cwd(),
            timeout,
            reject: false, // 不要在非零退出码时抛出异常
            stripFinalNewline: false, // 保留原始输出格式
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env, // 确保禁用颜色输出
        });

        return {
            code: result.exitCode ?? 0,
            stdout: result.stdout,
            stderr: result.stderr,
        };
    } catch (error: any) {
        // 处理超时和其他错误
        if (error.timedOut) {
            return {
                code: 124, // timeout exit code
                stdout: error.stdout || '',
                stderr: (error.stderr || '') + '\nProcess timed out',
            };
        }

        return {
            code: error.exitCode || 1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message || 'Unknown error',
        };
    }
};

export const grep_tool = tool(
    async ({ args, head_limit }, runtime: ToolRuntime<BaseAgentStateType>) => {
        // 安全检查：确保 cwd 存在
        if (!runtime.state.cwd) {
            throw new Error('Current working directory (cwd) is not set in the agent state.');
        }

        // 基本验证：确保 args 数组不为空
        if (!args || args.length === 0) {
            return 'Error: No arguments provided. Please provide ripgrep arguments.';
        }

        // 如果没有设置默认限制，添加性能优化参数
        if (!head_limit && !args.includes('--max-count')) {
            head_limit = 500; // 默认限制为500行结果
        }

        // 解析路径参数：查找最后一个路径参数，如果是相对路径，基于 cwd 解析
        const lastArg = args[args.length - 1];
        let resolvedArgs = [...args];
        if (lastArg && !lastArg.startsWith('-')) {
            // 最后一个参数看起来像路径
            resolvedArgs[resolvedArgs.length - 1] = resolve(runtime.state.cwd, lastArg);
        }

        // 执行 ripgrep 命令
        let result = await execCommand(rgPath, resolvedArgs, {
            timeout: 15000, // 15秒超时
            cwd: runtime.state.cwd,
        });

        // 如果需要限制输出行数，使用 Node.js 处理而不是 shell pipe
        if (head_limit && result.stdout) {
            const lines = result.stdout.split('\n');
            if (lines.length > head_limit) {
                result.stdout = lines.slice(0, head_limit).join('\n');
            }
        }

        if (result.code !== 0 && result.stderr) {
            // rg exits with code 1 if no matches are found, which is not an error if stdout is empty.
            if (result.code === 1 && result.stdout === '') {
                return 'No matches found.';
            }
            // 检查是否是超时错误
            if (result.code === 124 || result.stderr.includes('timeout') || result.stderr.includes('timed out')) {
                return `Error: Search timed out after 15 seconds. Please use a more specific pattern or limit the search scope with type/glob/path parameters.`;
            }
            return `Error executing ripgrep: ${result.stderr}`;
        }

        return result.stdout || 'No matches found.';
    },
    {
        name: 'search_files_rg',
        description: `Ripgrep (rg) - A fast text search tool that recursively searches directories for regex patterns

⚠️ IMPORTANT USAGE GUIDELINES:
- This tool wraps the ripgrep (rg) command-line tool
- Use this ONLY for searching TEXT PATTERNS within file contents
- For reading entire files, use the Read tool instead
- For finding files by name patterns, use the Glob tool instead

🔍 SEARCH PATH REQUIREMENT:
- MUST always specify a search path at the end of args array
- If no specific path needed, use "./" for current directory
- Never omit the path parameter - ripgrep requires it
- Relative paths are resolved relative to the current working directory (cwd)

Usage - Pass ripgrep (rg) arguments as an array:
The args array corresponds directly to 'rg [OPTIONS] PATTERN [PATH...]'

Examples:
- Search pattern in current directory: ["PATTERN", "./"]
- Search in specific path: ["PATTERN", "src/"]
- Search with file type filter: ["--type", "ts", "PATTERN", "./"]
- Case insensitive search: ["-i", "PATTERN", "./"]
- Show line numbers: ["-n", "PATTERN", "./"]
- Show context lines: ["-C", "3", "PATTERN", "./"]
- Only show file names: ["-l", "PATTERN", "./"]
- Count matches: ["-c", "PATTERN", "./"]
- Multiple options: ["-n", "-i", "--type", "js", "function", "src/"]

Common ripgrep (rg) options:
- -i, --ignore-case: Case insensitive search
- -n, --line-number: Show line numbers
- -A NUM: Show NUM lines after each match
- -B NUM: Show NUM lines before each match
- -C NUM: Show NUM lines around each match
- -l, --files-with-matches: Only show file paths that match
- -c, --count: Only show count of matches per file
- --type TYPE: Only search files of TYPE (js, ts, py, rust, etc.)
- --glob PATTERN: Include/exclude files matching PATTERN
- --max-count NUM: Stop after NUM matches per file
- --no-ignore: Don't respect .gitignore files
- --hidden: Search hidden files and directories

Performance:
- 15 second timeout per search
- Results limited to 500 lines by default (use head_limit parameter)
- Respects .gitignore by default (use --no-ignore to override)
`,
        schema: z.object({
            description: z.string().optional().describe('what you want to do'),
            args: z
                .array(z.string())
                .describe(
                    'Ripgrep (rg) command arguments as array. Format: [OPTIONS...] PATTERN [PATH...]. MUST include path at end! Examples: ["import", "./"] (search "import" in current dir), ["-n", "-i", "function", "./"] (search "function" with line numbers, case insensitive), ["--type", "ts", "export", "src/"] (search "export" in TypeScript files in src/).',
                ),
            head_limit: z
                .number()
                .optional()
                .describe(
                    'Limit output to first N lines. If not specified and no --max-count in args, defaults to 500 lines for performance.',
                ),
        }),
    },
);
