/**
 * Shell Command Types
 *
 * Type definitions for shell command execution and process management.
 */

export interface BackgroundProcess {
    id: string;
    pid: number;
    command: string;
    cwd: string;
    startTime: Date;
    status: 'running' | 'exited' | 'killed';
    exitCode?: number;
    stdout?: string[];
    stderr?: string[];
}

export interface BashCommandRequest {
    command: string;
    cwd: string;
}

export interface BashCommandResponse {
    id: string;
    pid: number;
    output: string;
    status: 'running' | 'completed' | 'failed';
    exitCode?: number;
}
