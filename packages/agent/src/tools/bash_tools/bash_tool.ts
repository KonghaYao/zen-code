import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { execa, type ResultPromise } from 'execa';

// 管理后台进程的状态
export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
}

export const background_processes = new Map<number, ManagedProcess>();

// 检测操作系统
const isWindows = process.platform === 'win32';
const defaultShell = isWindows ? 'cmd.exe' : '/bin/bash';
const shellArgs = isWindows ? ['/d', '/s', '/c'] : ['-c'];

export const bash_tool = tool(
    async ({ command, timeout, run_in_background, kill_process_id, get_output_id, filter }) => {
        // 1. Kill Process Logic
        if (kill_process_id) {
            const pid = parseInt(kill_process_id, 10);
            const managed_process = background_processes.get(pid);

            if (!managed_process) {
                return `Error: No background process found with ID ${kill_process_id}.`;
            }

            managed_process.process.kill();
            background_processes.delete(pid);

            return `Successfully killed process with ID ${kill_process_id}.`;
        }

        // 2. Get Output Logic
        if (get_output_id) {
            const pid = parseInt(get_output_id, 10);
            const managed_process = background_processes.get(pid);

            if (!managed_process) {
                return `Error: No background process found with ID ${get_output_id}.`;
            }

            let stdout = managed_process.stdout.join('');
            let stderr = managed_process.stderr.join('');

            // Clear buffers after reading
            managed_process.stdout = [];
            managed_process.stderr = [];

            if (filter) {
                const regex = new RegExp(filter);
                stdout = stdout
                    .split('\n')
                    .filter((line) => regex.test(line))
                    .join('\n');
                stderr = stderr
                    .split('\n')
                    .filter((line) => regex.test(line))
                    .join('\n');
            }

            let output = '';
            if (stdout) output += `STDOUT:\n${stdout}\n`;
            if (stderr) output += `STDERR:\n${stderr}\n`;

            return output || 'No new output since last check.';
        }

        // 3. Run Command Logic
        if (!command) {
            return `Error: 'command' argument is required unless using 'kill_process_id' or 'get_output_id'.`;
        }

        if (run_in_background) {
            try {
                const child_process = execa(defaultShell, [...shellArgs, command], {
                    timeout,
                    reject: false,
                    windowsVerbatimArguments: isWindows, // Windows 特殊处理
                });

                if (!child_process.pid) {
                    return 'Failed to start command in background.';
                }

                const managed_process: ManagedProcess = {
                    process: child_process,
                    stdout: [],
                    stderr: [],
                };
                background_processes.set(child_process.pid, managed_process);

                child_process.stdout?.on('data', (data) => {
                    managed_process.stdout.push(data.toString());
                });
                child_process.stderr?.on('data', (data) => {
                    managed_process.stderr.push(data.toString());
                });
                child_process.on('close', () => {
                    // 进程结束后可以在这里做清理，或者保留直到用户手动 kill/read 完
                });

                return `Command started in background with ID: ${child_process.pid}`;
            } catch (error) {
                return `Error starting background command: ${error}`;
            }
        } else {
            try {
                const result = await execa(defaultShell, [...shellArgs, command], {
                    timeout,
                    reject: false,
                    windowsVerbatimArguments: isWindows,
                });
                if (result.exitCode !== 0) {
                    return result.stderr;
                }
                return result.stdout;
            } catch (error) {
                return `Error executing command: ${error}`;
            }
        }
    },
    {
        name: 'terminal',
        description: `Executes commands in a persistent shell session (Bash on Linux/macOS, CMD on Windows).
Features:
- Run commands (foreground or background)
- Retrieve background process output
- Kill background processes
- Cross-platform support (auto-detects OS)

Usage:
1. Run Command: Provide \`command\`. Optional: \`run_in_background\`, \`timeout\`.
2. Check Output: Provide \`get_output_id\`. Optional: \`filter\`.
3. Kill Process: Provide \`kill_process_id\`.

Notes:
- For file paths with spaces, ALWAYS use quotes: "path/to file"
- Avoid interactive commands (like top, vim)
- Use '&&' or ';' to chain commands (PowerShell/CMD syntax varies, simple chaining often works)
- CAN'T BATCH CALL THIS TOOL!
`,
        schema: z.object({
            description: z.string().describe('what you want to do'),
            command: z.string().optional().describe('The command to execute (required for running commands)'),
            timeout: z.number().optional().describe('Timeout in ms (default: 120000)'),
            run_in_background: z.boolean().optional().describe('Run command in background'),
            kill_process_id: z.string().optional().describe('ID of process to kill'),
            get_output_id: z.string().optional().describe('ID of process to get output from'),
            filter: z.string().optional().describe('Regex to filter output (only for get_output_id)'),
        }),
    },
);
