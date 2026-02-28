/**
 * Bash Command Executor
 *
 * Executes shell commands with cross-platform support and background process management.
 * Integrates with existing background process manager from @langgraph-js/agent-middlewares.
 *
 * ## Features
 *
 * - Execute shell commands in background
 * - Return command output and status
 * - Register processes with background process manager
 * - Cross-platform support (Bash/CMD)
 */

import { execa } from 'execa';
import { v4 as uuidv4 } from 'uuid';
import { background_processes } from '@langgraph-js/agent-middlewares';
import type { ManagedProcess } from '@langgraph-js/agent-middlewares';

// Types
export interface BashCommandResponse {
    id: string;
    pid: number;
    output: string;
    status: 'running' | 'completed' | 'failed';
    exitCode?: number;
}

export interface BashCommandOptions {
    command: string;
    cwd: string;
    timeout?: number;
}

// UUID to PID mapping for process lookup
const uuidToPidMap = new Map<string, number>();

/**
 * Execute a shell command and return the result.
 *
 * @param options - Command execution options
 * @returns Promise resolving to command response with process info
 */
export async function executeBashCommand(options: BashCommandOptions): Promise<BashCommandResponse> {
    const { command, cwd, timeout } = options;

    // Generate unique process ID for tracking
    const processId = uuidv4();

    try {
        // Detect OS and set appropriate shell
        const isWindows = process.platform === 'win32';
        const shell = isWindows ? 'cmd.exe' : '/bin/bash';
        const shellArgs = isWindows ? ['/d', '/s', '/c'] : ['-c'];

        // Execute command in background
        const childProcess = execa(shell, [...shellArgs, command], {
            cwd,
            detached: true, // Create process group for easy killing
            reject: false,
            windowsVerbatimArguments: isWindows,
            timeout,
        });

        if (!childProcess.pid) {
            return {
                id: processId,
                pid: 0,
                output: 'Error: Failed to start command',
                status: 'failed',
                exitCode: -1,
            };
        }

        // Store process info in existing background process manager
        const processInfo: ManagedProcess = {
            process: childProcess,
            stdout: [],
            stderr: [],
            command,
            startTime: Date.now(),
        };

        background_processes.set(childProcess.pid!, processInfo);

        // Store UUID to PID mapping for later lookup
        uuidToPidMap.set(processId, childProcess.pid!);

        // Collect output
        const outputBuffer: string[] = [];

        childProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            outputBuffer.push(output);
            processInfo.stdout.push(output);
        });

        childProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            outputBuffer.push(output);
            processInfo.stderr.push(output);
        });

        // Handle process completion
        childProcess.on('close', (code) => {
            // Update status in managed process
            (processInfo as any).status = code === 0 ? 'completed' : 'failed';
            (processInfo as any).exitCode = code;
        });

        // Wait for a short time to get initial output
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Determine initial status
        const initialStatus = (processInfo as any).status || 'running';

        return {
            id: processId,
            pid: childProcess.pid!,
            output: outputBuffer.join(''),
            status: initialStatus,
            exitCode: (processInfo as any).exitCode,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            id: processId,
            pid: 0,
            output: `Error: ${errorMessage}`,
            status: 'failed',
            exitCode: -1,
        };
    }
}

/**
 * Get the status and output of a background command.
 *
 * @param id - Process UUID
 * @returns Promise resolving to command response or null if not found
 */
export async function getBashCommandStatus(id: string): Promise<BashCommandResponse | null> {
    // Look up PID from UUID
    const pid = uuidToPidMap.get(id);

    if (!pid) {
        return null;
    }

    const processInfo = background_processes.get(pid);

    if (!processInfo) {
        return null;
    }

    return {
        id,
        pid,
        output: [...processInfo.stdout, ...processInfo.stderr].join(''),
        status: (processInfo as any).status || 'running',
        exitCode: (processInfo as any).exitCode,
    };
}

/**
 * Kill a background command.
 *
 * @param id - Process UUID
 * @returns Promise resolving to success or error message
 */
export async function killBashCommand(id: string): Promise<{ success: boolean; message?: string }> {
    // Look up PID from UUID
    const pid = uuidToPidMap.get(id);

    if (!pid) {
        return { success: false, message: 'Process not found' };
    }

    const processInfo = background_processes.get(pid);

    if (!processInfo) {
        return { success: false, message: 'Process not found' };
    }

    try {
        // Kill process group
        process.kill(-pid, 'SIGTERM');

        // Give it a moment to terminate gracefully
        setTimeout(() => {
            try {
                process.kill(-pid, 'SIGKILL');
            } catch {
                // Already dead
            }
        }, 1000);

        background_processes.delete(pid);
        uuidToPidMap.delete(id);

        return { success: true, message: `Process ${pid} killed` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: `Failed to kill process: ${errorMessage}` };
    }
}
