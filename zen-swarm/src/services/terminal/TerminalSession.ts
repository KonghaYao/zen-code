/**
 * 单个终端会话
 * 封装 PTY 进程
 *
 * 统一使用 bun-pty（跨平台：macOS / Linux / Windows）
 *
 * 支持输出缓存：断线重连后可恢复历史输出
 */

import { spawn } from 'bun-pty';
import type { IPty } from 'bun-pty';
import type { TerminalSessionInfo } from './types.js';

/**
 * Ring Buffer 实现 - 固定大小的循环缓冲区
 * 用于存储终端输出历史
 */
class RingBuffer<T> {
    private buffer: (T | undefined)[];
    private head = 0;
    private count = 0;

    constructor(private capacity: number) {
        this.buffer = new Array(capacity);
    }

    push(item: T): void {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this.count < this.capacity) this.count++;
    }

    getAll(): T[] {
        if (this.count < this.capacity) {
            return this.buffer.slice(0, this.count) as T[];
        }
        // 环形缓冲区已满，需要按正确顺序返回
        const result: T[] = [];
        for (let i = 0; i < this.capacity; i++) {
            const idx = (this.head + i) % this.capacity;
            const item = this.buffer[idx];
            if (item !== undefined) result.push(item);
        }
        return result;
    }

    get length(): number {
        return this.count;
    }

    clear(): void {
        this.buffer = new Array(this.capacity);
        this.head = 0;
        this.count = 0;
    }
}

// 获取默认 shell
function getDefaultShell(): string {
    return process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash');
}

// 默认输出缓冲区大小（行数）
const DEFAULT_BUFFER_SIZE = 10000;

export class TerminalSession {
    private ptyProcess: IPty;
    private sessionId: string;
    private createdAt: number;
    private cwd: string;
    private _cols: number;
    private _rows: number;
    private outputCallbacks: Set<(data: string) => void> = new Set();
    private exitCallbacks: Set<(code: number) => void> = new Set();
    private isExited = false;

    // 输出缓冲区 - 用于断线重连后恢复历史
    private outputBuffer: RingBuffer<string>;
    private maxBufferSize: number;

    constructor(sessionId: string, cols: number, rows: number, cwd?: string, maxBufferSize?: number) {
        this.sessionId = sessionId;
        this.createdAt = Date.now();
        this.cwd = cwd ?? process.cwd();
        this._cols = cols;
        this._rows = rows;
        this.maxBufferSize = maxBufferSize ?? DEFAULT_BUFFER_SIZE;
        this.outputBuffer = new RingBuffer<string>(this.maxBufferSize);

        const shell = getDefaultShell();
        this.ptyProcess = spawn(shell, [], {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: this.cwd,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
            } as Record<string, string>,
        });

        this.ptyProcess.onData((data) => {
            if (!this.isExited) {
                this.outputBuffer.push(data);
                this.outputCallbacks.forEach((cb) => cb(data));
            }
        });

        this.ptyProcess.onExit(({ exitCode }) => {
            this.isExited = true;
            this.exitCallbacks.forEach((cb) => cb(exitCode));
        });
    }

    get info(): TerminalSessionInfo {
        return {
            sessionId: this.sessionId,
            pid: this.ptyProcess.pid,
            createdAt: this.createdAt,
            cols: this._cols,
            rows: this._rows,
            cwd: this.cwd,
        };
    }

    get pid(): number {
        return this.ptyProcess.pid;
    }

    /**
     * 是否使用完整 PTY 模式（始终为 true）
     */
    get isPtyMode(): boolean {
        return true;
    }

    /**
     * 向终端写入数据（用户输入）
     */
    write(data: string): void {
        if (this.isExited) return;
        this.ptyProcess.write(data);
    }

    /**
     * 调整终端大小
     */
    resize(cols: number, rows: number): void {
        if (this.isExited) return;
        this._cols = cols;
        this._rows = rows;
        this.ptyProcess.resize(cols, rows);
    }

    /**
     * 注册输出回调
     */
    onOutput(callback: (data: string) => void): () => void {
        this.outputCallbacks.add(callback);
        return () => {
            this.outputCallbacks.delete(callback);
        };
    }

    /**
     * 注册退出回调
     */
    onExit(callback: (code: number) => void): () => void {
        this.exitCallbacks.add(callback);
        return () => {
            this.exitCallbacks.delete(callback);
        };
    }

    /**
     * 获取历史输出（用于断线重连后恢复）
     */
    getHistory(): string[] {
        return this.outputBuffer.getAll();
    }

    /**
     * 获取缓冲区大小
     */
    get bufferSize(): number {
        return this.outputBuffer.length;
    }

    /**
     * 销毁终端会话
     */
    kill(): void {
        if (!this.isExited) {
            try {
                this.ptyProcess.kill();
            } catch {
                // 忽略错误
            }
        }
        this.outputCallbacks.clear();
        this.exitCallbacks.clear();
    }

    /**
     * 检查是否已退出
     */
    get exited(): boolean {
        return this.isExited;
    }
}
