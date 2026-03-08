import { spawn, type ChildProcess } from 'child_process';

export interface SshTunnelOptions {
    /** SSH target, e.g. user@example.com */
    serverTarget: string;
    /** Port on the remote server to bind */
    remotePort: number;
    /** Local port to forward to */
    localPort: number;
    /** SSH server port (default 22) */
    sshPort?: number;
    /** Path to identity file (optional) */
    identityFile?: string;
}

export type TunnelStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TunnelState {
    status: TunnelStatus;
    error?: string;
    pid?: number;
}

export class SshTunnel {
    private process: ChildProcess | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;
    private readonly RECONNECT_DELAY_MS = 5_000;

    public state: TunnelState = { status: 'disconnected' };
    public onStateChange?: (state: TunnelState) => void;

    constructor(private opts: SshTunnelOptions) {}

    start(): void {
        this.stopped = false;
        this.connect();
    }

    private connect(): void {
        if (this.stopped) return;

        this.setState({ status: 'connecting' });

        const args = this.buildArgs();
        // inherit stdio so SSH password/passphrase prompts reach the terminal directly
        const proc = spawn('ssh', args, { stdio: 'inherit' });
        this.process = proc;

        proc.on('spawn', () => {
            // Give SSH a moment; if still running assume connected
            setTimeout(() => {
                if (this.state.status === 'connecting' && !this.stopped) {
                    this.setState({ status: 'connected', pid: proc.pid });
                }
            }, 2_000);
        });

        proc.on('close', (code) => {
            this.process = null;
            if (!this.stopped) {
                this.setState({ status: 'disconnected', error: `SSH exited with code ${code}` });
                this.scheduleReconnect();
            }
        });

        proc.on('error', (err) => {
            this.setState({ status: 'error', error: err.message });
            if (!this.stopped) this.scheduleReconnect();
        });
    }

    private buildArgs(): string[] {
        const { serverTarget, remotePort, localPort, sshPort = 22, identityFile } = this.opts;

        const args: string[] = [
            '-N',
            '-o',
            'ExitOnForwardFailure=yes',
            '-o',
            'ServerAliveInterval=30',
            '-o',
            'ServerAliveCountMax=3',
            '-p',
            String(sshPort),
            '-R',
            `${remotePort}:localhost:${localPort}`,
        ];

        if (identityFile) {
            args.push('-i', identityFile);
        }

        args.push(serverTarget);
        return args;
    }

    private scheduleReconnect(): void {
        log(`[zen-tunnel] reconnecting in ${this.RECONNECT_DELAY_MS / 1000}s...`);
        this.reconnectTimer = setTimeout(() => this.connect(), this.RECONNECT_DELAY_MS);
    }

    stop(): void {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
        }
        this.setState({ status: 'disconnected' });
    }

    private setState(state: TunnelState): void {
        this.state = state;
        this.onStateChange?.(state);
    }
}

function log(msg: string): void {
    process.stdout.write(msg + '\n');
}
