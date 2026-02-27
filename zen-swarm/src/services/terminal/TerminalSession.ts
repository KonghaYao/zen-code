/**
 * 单个终端会话
 * 封装 PTY 进程
 *
 * Bun 环境：使用 Bun.Terminal 官方 API
 * Node.js 环境：使用 node-pty
 */

import { spawn } from 'child_process';
import type { TerminalSessionInfo } from './types.js';

const isBun = typeof Bun !== 'undefined';

// 检测 node-pty 是否可用
let pty: typeof import('node-pty') | null = null;
try {
    pty = require('node-pty');
} catch {
    console.warn('node-pty not available');
}

// 检测 node-pty 是否在当前运行时实际工作
const isPtyWorking = (() => {
    if (!pty || isBun) return false;
    // 在 Node.js 下，node-pty 应该工作
    return true;
})();

// 获取默认 shell
function getDefaultShell(): string {
    return process.env.SHELL || '/bin/bash';
}

export class TerminalSession {
    private ptyProcess: import('node-pty').IPty | null = null;
    private bunTerminal: Bun.Terminal | null = null;
    private bunProcess: Bun.Subprocess | null = null;
    private childProcess: ReturnType<typeof spawn> | null = null;
    private sessionId: string;
    private createdAt: number;
    private cwd: string;
    private _cols: number;
    private _rows: number;
    private outputCallbacks: Set<(data: string) => void> = new Set();
    private exitCallbacks: Set<(code: number) => void> = new Set();
    private isExited = false;
    private _pid: number = 0;
    private _isPtyMode: boolean = false;

    constructor(sessionId: string, cols: number, rows: number, cwd?: string) {
        this.sessionId = sessionId;
        this.createdAt = Date.now();
        this.cwd = cwd ?? process.cwd();
        this._cols = cols;
        this._rows = rows;

        if (isPtyWorking && pty) {
            // Node.js 环境：使用 node-pty（完整 PTY 支持）
            console.log('[TerminalSession] Using node-pty mode');
            this._isPtyMode = true;
            const shell = getDefaultShell();
            this.ptyProcess = pty.spawn(shell, [], {
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
            this._pid = this.ptyProcess.pid;

            this.ptyProcess.onData((data) => {
                if (!this.isExited) {
                    this.outputCallbacks.forEach((cb) => cb(data));
                }
            });

            this.ptyProcess.onExit(({ exitCode }) => {
                this.isExited = true;
                this.exitCallbacks.forEach((cb) => cb(exitCode));
            });
        } else if (isBun) {
            // Bun 环境：使用 Bun.Terminal 官方 API
            console.log('[TerminalSession] Using Bun.Terminal API, cols:', cols, 'rows:', rows);
            this._isPtyMode = true;

            // 保存 this 引用，以便在 data 回调中使用
            const self = this;

            // 使用官方 Bun.Terminal API
            this.bunTerminal = new Bun.Terminal({
                cols,
                rows,
                data(_terminal, data) {
                    // Bun terminal 返回的是 Uint8Array，使用 TextDecoder 解码
                    const decoder = new TextDecoder();
                    const str = decoder.decode(data);

                    console.log(
                        '[TerminalSession] Bun.Terminal data received, str:',
                        JSON.stringify(str.slice(0, 30)),
                        'callbacks:',
                        self.outputCallbacks.size,
                    );
                    if (!self.isExited && str) {
                        self.outputCallbacks.forEach((cb) => {
                            console.log('[TerminalSession] calling output callback');
                            cb(str);
                        });
                    }
                },
            });

            // 使用 Bun.spawn 连接到 PTY
            const shell = getDefaultShell();
            const proc = Bun.spawn([shell], {
                cwd: this.cwd,
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                },
                terminal: this.bunTerminal,
            });
            this.bunProcess = proc;
            this._pid = proc.pid;
            console.log('[TerminalSession] Bun process started, pid:', proc.pid);

            // 监听退出
            proc.exited
                .then((code) => {
                    this.isExited = true;
                    this.exitCallbacks.forEach((cb) => cb(code ?? 0));
                })
                .catch(() => {
                    this.isExited = true;
                    this.exitCallbacks.forEach((cb) => cb(1));
                });
        } else {
            // 其他环境：使用 script 命令创建 PTY
            this._isPtyMode = true;
            const shell = getDefaultShell();
            this.childProcess = spawn('script', ['-q', '/dev/null', shell], {
                cwd: this.cwd,
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                } as Record<string, string>,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            this._pid = this.childProcess.pid ?? 0;

            this.childProcess.stdout?.on('data', (data: Buffer) => {
                if (!this.isExited) {
                    const str = data.toString();
                    this.outputCallbacks.forEach((cb) => cb(str));
                }
            });

            this.childProcess.stderr?.on('data', (data: Buffer) => {
                if (!this.isExited) {
                    const str = data.toString();
                    this.outputCallbacks.forEach((cb) => cb(str));
                }
            });

            this.childProcess.on('close', (code) => {
                this.isExited = true;
                this.exitCallbacks.forEach((cb) => cb(code ?? 0));
            });

            this.childProcess.on('error', (err) => {
                console.error('Terminal process error:', err);
            });
        }
    }

    get info(): TerminalSessionInfo {
        return {
            sessionId: this.sessionId,
            pid: this._pid,
            createdAt: this.createdAt,
            cols: this._cols,
            rows: this._rows,
            cwd: this.cwd,
        };
    }

    get pid(): number {
        return this._pid;
    }

    /**
     * 是否使用完整 PTY 模式
     */
    get isPtyMode(): boolean {
        return this._isPtyMode;
    }

    /**
     * 向终端写入数据（用户输入）
     */
    write(data: string): void {
        if (this.isExited) return;

        if (this.ptyProcess) {
            // node-pty 模式
            this.ptyProcess.write(data);
        } else if (this.bunTerminal) {
            // Bun.Terminal 模式 - 直接使用 terminal.write()
            // 官方 API 支持字符串和 Uint8Array
            this.bunTerminal.write(data);
        } else if (this.childProcess && 'stdin' in this.childProcess && this.childProcess.stdin) {
            // child_process 模式
            const stdin = this.childProcess.stdin as import('stream').Writable;
            if (stdin.writable) {
                stdin.write(data);
            }
        }
    }

    /**
     * 调整终端大小
     */
    resize(cols: number, rows: number): void {
        if (this.isExited) return;
        this._cols = cols;
        this._rows = rows;

        if (this.ptyProcess) {
            this.ptyProcess.resize(cols, rows);
        } else if (this.bunTerminal) {
            // Bun.Terminal 原生支持 resize
            this.bunTerminal.resize(cols, rows);
        }
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
     * 销毁终端会话
     */
    kill(): void {
        if (!this.isExited) {
            try {
                if (this.ptyProcess) {
                    this.ptyProcess.kill();
                } else if (this.bunTerminal) {
                    // Bun.Terminal 模式
                    this.bunTerminal.close();
                    this.bunProcess?.kill();
                } else if (this.childProcess) {
                    // child_process
                    const stdin = this.childProcess.stdin as import('stream').Writable | undefined;
                    stdin?.end();
                    this.childProcess.kill('SIGTERM');
                }
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
