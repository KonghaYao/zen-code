/**
 * 进程监控服务
 * 跨平台进程信息采集（macOS/Linux/Windows）
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ProcessStatus = 'running' | 'sleeping' | 'idle' | 'stopped' | 'zombie';

export interface ProcessInfo {
    pid: number;
    ppid: number;
    name: string;
    command?: string;
    cpuPercent: number;
    memoryBytes: number;
    status: ProcessStatus;
    startTime: Date;
    user?: string;
    diskRead?: number;
    diskWrite?: number;
    networkIn?: number;
    networkOut?: number;
    energyImpact?: number;
    agentType?: 'main' | 'agent' | 'task' | 'mcp';
    taskId?: string;
    agentId?: string;
}

export interface ProcessTreeNode extends ProcessInfo {
    children: ProcessTreeNode[];
}

export interface SystemStats {
    cpuTotal: number;
    memoryTotal: number;
    memoryUsed: number;
    uptime: number;
}

/**
 * 进程监控服务类
 */
export class ProcessMonitor {
    private platform: NodeJS.Platform;

    constructor() {
        this.platform = process.platform;
    }

    /**
     * 获取进程列表
     */
    async getProcessList(): Promise<ProcessInfo[]> {
        try {
            if (this.platform === 'darwin' || this.platform === 'linux') {
                return await this.getUnixProcessList();
            } else if (this.platform === 'win32') {
                return await this.getWindowsProcessList();
            }
            return [];
        } catch (error) {
            console.error('Error getting process list:', error);
            return [];
        }
    }

    /**
     * 获取 Unix (macOS/Linux) 进程列表
     */
    private async getUnixProcessList(): Promise<ProcessInfo[]> {
        try {
            // 使用 ps 命令获取进程信息
            // macOS: ps -A -o pid,ppid,comm,%cpu,%mem,state,etime,user
            let stdout: string;

            if (this.platform === 'darwin') {
                // macOS: 获取前 100 个进程以避免超时
                const { stdout: rawOutput } = await execAsync('ps -A -o pid,ppid,comm,%cpu,%mem,state,etime,user');
                // 移除第一行标题
                const lines = rawOutput.trim().split('\n').slice(1);
                stdout = lines.join('\n');
            } else {
                // Linux: 可以获取所有进程
                stdout = (await execAsync('ps -eo pid,ppid,comm,%cpu,%mem,state,etime,user --no-headers')).stdout;
            }

            const processes: ProcessInfo[] = [];
            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                const parts = trimmedLine.split(/\s+/);
                if (parts.length < 8) continue;

                const [pid, ppid, name, cpu, mem, state, etime, user, ...cmdParts] = parts;

                try {
                    const cpuNum = parseFloat(cpu);
                    const memNum = parseFloat(mem);
                    processes.push({
                        pid: parseInt(pid),
                        ppid: parseInt(ppid),
                        name,
                        command: cmdParts.join(' ') || '',
                        cpuPercent: isNaN(cpuNum) ? 0 : cpuNum,
                        memoryBytes: this.parseMemoryPercent(isNaN(memNum) ? 0 : memNum),
                        status: this.parseProcessState(state),
                        startTime: this.parseEtime(etime),
                        user,
                    });
                } catch (error) {
                    // 跳过解析失败的行
                    continue;
                }
            }

            return processes;
        } catch (error) {
            console.error('[ProcessMonitor] Error getting Unix process list:', error);
            return [];
        }
    }

    /**
     * 获取 Windows 进程列表
     */
    private async getWindowsProcessList(): Promise<ProcessInfo[]> {
        // 使用 tasklist 命令
        const { stdout } = await execAsync('tasklist /FO CSV /NH');

        const processes: ProcessInfo[] = [];
        const lines = stdout.trim().split('\n');

        // CSV 格式：名称, PID, 会话名, 会话#, 内存使用
        // 需要额外使用 wmic 获取更多信息
        try {
            const { stdout: wmicStdout } = await execAsync(
                'wmic process get ProcessId,ParentProcessId,Name,CommandLine /format:csv',
            );
            const wmicLines = wmicStdout.trim().split('\n').slice(1); // 跳过表头

            for (const line of wmicLines) {
                if (!line.trim()) continue;
                const [_, pid, ppid, name, command] = line.split(',').map((s) => s.replace(/^"|"$/g, ''));

                if (!pid || !name) continue;

                processes.push({
                    pid: parseInt(pid),
                    ppid: parseInt(ppid || '0'),
                    name,
                    command,
                    cpuPercent: 0, // Windows 需要额外计算
                    memoryBytes: 0, // 需要额外获取
                    status: 'running',
                    startTime: new Date(),
                });
            }
        } catch (error) {
            console.error('Error getting detailed Windows process info:', error);
        }

        return processes;
    }

    /**
     * 获取 Zen-Swarm 相关进程
     */
    async getZenSwarmProcesses(): Promise<ProcessInfo[]> {
        try {
            const allProcesses = await this.getProcessList();
            const currentPid = process.pid;

            // 找到所有与 zen-swarm 相关的进程
            const zenSwarmProcesses: ProcessInfo[] = [];

            // 1. 主进程
            const mainProcess = allProcesses.find((p) => p.pid === currentPid);
            if (mainProcess) {
                zenSwarmProcesses.push({
                    ...mainProcess,
                    agentType: 'main',
                });
            }

            // 2. 子进程（通过进程树）
            const processTree = await this.getProcessTree(currentPid);
            const flattenTree = (node: ProcessTreeNode): ProcessInfo[] => {
                const { children, ...nodeInfo } = node;
                const result: ProcessInfo[] = [nodeInfo];
                for (const child of children) {
                    result.push(...flattenTree(child));
                }
                return result;
            };

            const childProcesses = processTree ? flattenTree(processTree).slice(1) : [];
            zenSwarmProcesses.push(...childProcesses);

            // 3. 标记 agent 类型（通过名称匹配）
            for (const proc of zenSwarmProcesses) {
                if (proc.command?.includes('agent-') || proc.name.includes('agent')) {
                    proc.agentType = 'agent';
                    // 尝试提取 agent ID
                    const agentMatch = proc.command?.match(/agent-([a-zA-Z0-9-]+)/);
                    if (agentMatch) {
                        proc.agentId = agentMatch[1];
                    }
                } else if (proc.command?.includes('task-') || proc.name.includes('task')) {
                    proc.agentType = 'task';
                    // 尝试提取 task ID
                    const taskMatch = proc.command?.match(/task-([a-zA-Z0-9-]+)/);
                    if (taskMatch) {
                        proc.taskId = taskMatch[1];
                    }
                } else if (proc.command?.includes('mcp') || proc.name.includes('mcp')) {
                    proc.agentType = 'mcp';
                }
            }

            return zenSwarmProcesses;
        } catch (error) {
            console.error('Error getting Zen-Swarm processes:', error);
            return [];
        }
    }

    /**
     * 获取进程树
     */
    async getProcessTree(rootPid?: number): Promise<ProcessTreeNode | null> {
        try {
            const allProcesses = await this.getProcessList();

            // 如果没有指定根 PID，使用当前进程
            const root = rootPid || process.pid;

            // 构建进程树
            const processMap = new Map<number, ProcessTreeNode>();
            allProcesses.forEach((p) => {
                // 创建 ProcessTreeNode，添加 children 属性
                processMap.set(p.pid, {
                    ...p,
                    children: [],
                });
            });

            const rootNode = processMap.get(root);
            if (!rootNode) return null;

            // 构建父子关系
            for (const node of processMap.values()) {
                if (node.pid === root) continue;

                const parentNode = processMap.get(node.ppid);
                if (parentNode) {
                    parentNode.children.push(node);
                }
            }

            return rootNode;
        } catch (error) {
            console.error('Error getting process tree:', error);
            return null;
        }
    }

    /**
     * 获取系统统计信息
     */
    async getSystemStats(): Promise<SystemStats> {
        try {
            if (this.platform === 'darwin') {
                return await this.getMacOSStats();
            } else if (this.platform === 'linux') {
                return await this.getLinuxStats();
            } else if (this.platform === 'win32') {
                return await this.getWindowsStats();
            }
            return {
                cpuTotal: 0,
                memoryTotal: 0,
                memoryUsed: 0,
                uptime: process.uptime(),
            };
        } catch (error) {
            console.error('Error getting system stats:', error);
            return {
                cpuTotal: 0,
                memoryTotal: 0,
                memoryUsed: 0,
                uptime: process.uptime(),
            };
        }
    }

    /**
     * macOS 系统统计
     */
    private async getMacOSStats(): Promise<SystemStats> {
        // 获取内存信息
        const { stdout: memStdout } = await execAsync('vm_stat');
        const memLines = memStdout.trim().split('\n');

        let pageSize = 4096; // 默认页面大小
        let freePages = 0;
        let activePages = 0;
        let inactivePages = 0;
        let wiredPages = 0;

        for (const line of memLines) {
            const match = line.match(/([^:]+):\s*(\d+)/);
            if (match) {
                const [, key, value] = match;
                const numValue = parseInt(value);
                if (key === 'Pages free') freePages = numValue;
                else if (key === 'Pages active') activePages = numValue;
                else if (key === 'Pages inactive') inactivePages = numValue;
                else if (key === 'Pages wired down') wiredPages = numValue;
                else if (key === 'page size of') pageSize = numValue;
            }
        }

        const memoryTotal = 16 * 1024 * 1024 * 1024; // 16GB 默认值，实际应通过 sysctl 获取
        const memoryUsed = (activePages + inactivePages + wiredPages) * pageSize;

        return {
            cpuTotal: 100, // CPU 总使用率
            memoryTotal,
            memoryUsed,
            uptime: process.uptime(),
        };
    }

    /**
     * Linux 系统统计
     */
    private async getLinuxStats(): Promise<SystemStats> {
        const { stdout } = await execAsync('cat /proc/meminfo');

        const meminfo: Record<string, number> = {};
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
            const match = line.match(/^([^:]+):\s*(\d+)\s*kB$/);
            if (match) {
                meminfo[match[1]] = parseInt(match[2]) * 1024;
            }
        }

        return {
            cpuTotal: 100,
            memoryTotal: meminfo['MemTotal'] || 0,
            memoryUsed:
                (meminfo['MemTotal'] || 0) -
                (meminfo['MemFree'] || 0) -
                (meminfo['Buffers'] || 0) -
                (meminfo['Cached'] || 0),
            uptime: process.uptime(),
        };
    }

    /**
     * Windows 系统统计
     */
    private async getWindowsStats(): Promise<SystemStats> {
        try {
            const { stdout } = await execAsync('wmic os get TotalVisibleMemorySize,FreePhysicalMemory /format:csv');

            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const parts = lines[1].split(',').map((s) => s.replace(/^"|"$/g, ''));
                const totalMem = parseInt(parts[1] || '0') * 1024;
                const freeMem = parseInt(parts[2] || '0') * 1024;

                return {
                    cpuTotal: 100,
                    memoryTotal: totalMem,
                    memoryUsed: totalMem - freeMem,
                    uptime: process.uptime(),
                };
            }
        } catch (error) {
            console.error('Error getting Windows stats:', error);
        }

        return {
            cpuTotal: 100,
            memoryTotal: 0,
            memoryUsed: 0,
            uptime: process.uptime(),
        };
    }

    /**
     * 获取进程日志
     */
    async getLogs(pid: number, lines: number = 100): Promise<string[]> {
        // 尝试从多个位置读取日志
        const logPaths = [`.langgraph_api/logs/${pid}.log`, `logs/${pid}.log`, `/tmp/${pid}.log`];

        for (const path of logPaths) {
            try {
                const { stdout } = await execAsync(`tail -n ${lines} ${path} 2>/dev/null || echo ''`);
                if (stdout.trim()) {
                    return stdout.trim().split('\n');
                }
            } catch (error) {
                // 文件不存在，继续尝试下一个路径
                continue;
            }
        }

        return [];
    }

    /**
     * 终止进程
     */
    async killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
        try {
            if (this.platform === 'win32') {
                // Windows 使用 taskkill
                const signalFlag = signal === 'SIGKILL' ? '/F' : '';
                await execAsync(`taskkill /PID ${pid} ${signalFlag}`);
            } else {
                // Unix 使用 kill
                await execAsync(`kill -${signal === 'SIGKILL' ? '9' : '15'} ${pid}`);
            }
            return true;
        } catch (error) {
            console.error(`Error killing process ${pid}:`, error);
            return false;
        }
    }

    /**
     * 解析内存百分比（转换为字节）
     */
    private parseMemoryPercent(percent: number): number {
        // 需要系统总内存，这里使用默认值 16GB
        const totalMemory = 16 * 1024 * 1024 * 1024;
        return Math.floor((percent / 100) * totalMemory);
    }

    /**
     * 解析进程状态
     */
    private parseProcessState(state: string): ProcessStatus {
        const stateMap: Record<string, ProcessStatus> = {
            R: 'running',
            S: 'sleeping',
            I: 'idle',
            D: 'idle',
            T: 'stopped',
            Z: 'zombie',
        };
        return stateMap[state] || 'idle';
    }

    /**
     * 解析运行时间
     */
    private parseEtime(etime: string): Date {
        // etime 格式：[[dd-]hh:]mm:ss
        const parts = etime.split(':');

        let seconds = 0;
        if (parts.length === 3) {
            // mm:ss
            seconds += parseInt(parts[0]) * 60;
            seconds += parseInt(parts[1]);
        } else if (parts.length === 2) {
            // hh:mm:ss
            seconds += parseInt(parts[0]) * 3600;
            seconds += parseInt(parts[1]) * 60;
            seconds += parseInt(parts[2] || '0');
        }

        const startTime = new Date();
        startTime.setTime(startTime.getTime() - seconds * 1000);
        return startTime;
    }
}

// 导出单例
export const processMonitor = new ProcessMonitor();
