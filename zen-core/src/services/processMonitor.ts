/**
 * 进程监控服务
 * 跨平台进程信息采集（macOS / Linux / Windows）
 *
 * 跨平台修复记录
 * ─────────────────────────────────────────────────────────────
 * [macOS]
 *   - getMacOSStats: sysctl hw.memsize 读取真实总内存（替代硬编码 16 GB）
 *   - getMacOSStats: top -l1 读取真实 CPU 使用率（替代固定 100）
 *   - getUnixProcessList: getSystemMemoryBytes() 供 parseMemoryPercent 使用
 *   - parseEtime: 支持 dd-hh:mm:ss 格式
 *
 * [Linux]
 *   - getLinuxStats: /proc/stat 双快照计算真实 CPU 使用率（替代固定 100）
 *   - getLinuxStats: /proc/uptime 读取系统 uptime（替代 process.uptime）
 *   - getUnixProcessList: 同 macOS — 用真实总内存换算 memoryBytes
 *
 * [Windows]
 *   - getWindowsProcessList: 用 PowerShell Get-Process 替代已废弃的 wmic
 *     补全 CPU 时间、内存（WorkingSet）、startTime、ppid
 *   - getWindowsStats: 用 PowerShell Get-CimInstance Win32_OperatingSystem
 *     替代已废弃的 wmic（Win11 已移除 wmic）
 *   - getLogs: 改为 Node.js fs.readFile，不再依赖 Unix-only 的 tail 命令
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';

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
    cpuTotal: number; // 当前 CPU 使用率 %（0–100）
    memoryTotal: number; // 字节
    memoryUsed: number; // 字节
    uptime: number; // 秒
}

/* ------------------------------------------------------------------ */
/*  Helper: CPU snapshot for Linux                                      */
/* ------------------------------------------------------------------ */

interface CpuSnapshot {
    idle: number;
    total: number;
}

async function readLinuxCpuSnapshot(): Promise<CpuSnapshot> {
    const raw = await fs.readFile('/proc/stat', 'utf8');
    const line = raw.split('\n')[0]; // 第一行：cpu 总计
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    // fields: user nice system idle iowait irq softirq steal ...
    const idle = (parts[3] ?? 0) + (parts[4] ?? 0); // idle + iowait
    const total = parts.reduce((s, v) => s + v, 0);
    return { idle, total };
}

/* ------------------------------------------------------------------ */
/*  ProcessMonitor                                                       */
/* ------------------------------------------------------------------ */

export class ProcessMonitor {
    private platform: NodeJS.Platform;
    /** 缓存系统总内存（字节），避免每次进程解析都执行 sysctl/PowerShell */
    private cachedTotalMemory: number | null = null;

    constructor() {
        this.platform = process.platform;
    }

    /* ── 公共 API ─────────────────────────────────────────────────── */

    async getProcessList(): Promise<ProcessInfo[]> {
        try {
            if (this.platform === 'darwin' || this.platform === 'linux') {
                return await this.getUnixProcessList();
            } else if (this.platform === 'win32') {
                return await this.getWindowsProcessList();
            }
            return [];
        } catch (error) {
            console.error('[ProcessMonitor] getProcessList error:', error);
            return [];
        }
    }

    async getZenSwarmProcesses(): Promise<ProcessInfo[]> {
        try {
            const allProcesses = await this.getProcessList();
            const currentPid = process.pid;
            const zenSwarmProcesses: ProcessInfo[] = [];

            const mainProcess = allProcesses.find((p) => p.pid === currentPid);
            if (mainProcess) {
                zenSwarmProcesses.push({ ...mainProcess, agentType: 'main' });
            }

            const processTree = await this.getProcessTree(currentPid);
            const flattenTree = (node: ProcessTreeNode): ProcessInfo[] => {
                const { children, ...nodeInfo } = node;
                return [nodeInfo, ...children.flatMap(flattenTree)];
            };
            const childProcesses = processTree ? flattenTree(processTree).slice(1) : [];
            zenSwarmProcesses.push(...childProcesses);

            for (const proc of zenSwarmProcesses) {
                if (proc.agentType === 'main') continue;
                if (proc.command?.includes('agent-') || proc.name.includes('agent')) {
                    proc.agentType = 'agent';
                    const m = proc.command?.match(/agent-([a-zA-Z0-9-]+)/);
                    if (m) proc.agentId = m[1];
                } else if (proc.command?.includes('task-') || proc.name.includes('task')) {
                    proc.agentType = 'task';
                    const m = proc.command?.match(/task-([a-zA-Z0-9-]+)/);
                    if (m) proc.taskId = m[1];
                } else if (proc.command?.includes('mcp') || proc.name.includes('mcp')) {
                    proc.agentType = 'mcp';
                }
            }

            return zenSwarmProcesses;
        } catch (error) {
            console.error('[ProcessMonitor] getZenSwarmProcesses error:', error);
            return [];
        }
    }

    async getProcessTree(rootPid?: number): Promise<ProcessTreeNode | null> {
        try {
            const allProcesses = await this.getProcessList();
            const root = rootPid ?? process.pid;

            const processMap = new Map<number, ProcessTreeNode>();
            for (const p of allProcesses) {
                processMap.set(p.pid, { ...p, children: [] });
            }

            const rootNode = processMap.get(root);
            if (!rootNode) return null;

            for (const node of processMap.values()) {
                if (node.pid === root) continue;
                processMap.get(node.ppid)?.children.push(node);
            }

            return rootNode;
        } catch (error) {
            console.error('[ProcessMonitor] getProcessTree error:', error);
            return null;
        }
    }

    async getSystemStats(): Promise<SystemStats> {
        try {
            if (this.platform === 'darwin') return await this.getMacOSStats();
            if (this.platform === 'linux') return await this.getLinuxStats();
            if (this.platform === 'win32') return await this.getWindowsStats();
        } catch (error) {
            console.error('[ProcessMonitor] getSystemStats error:', error);
        }
        return { cpuTotal: 0, memoryTotal: 0, memoryUsed: 0, uptime: os.uptime() };
    }

    /** 读取日志文件（纯 Node.js，跨平台） */
    async getLogs(pid: number, lines: number = 100): Promise<string[]> {
        const logPaths = [`.langgraph_api/logs/${pid}.log`, `logs/${pid}.log`, `${os.tmpdir()}/${pid}.log`];

        for (const logPath of logPaths) {
            try {
                const content = await fs.readFile(logPath, 'utf8');
                if (!content.trim()) continue;
                const allLines = content.trim().split('\n');
                // 取末尾 N 行（等同于 tail -n）
                return allLines.slice(-lines);
            } catch {
                // 文件不存在，尝试下一个路径
            }
        }
        return [];
    }

    async killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
        try {
            if (this.platform === 'win32') {
                const forceFlag = signal === 'SIGKILL' ? '/F' : '';
                await execAsync(`taskkill /PID ${pid} ${forceFlag}`);
            } else {
                const sig = signal === 'SIGKILL' ? '9' : '15';
                await execAsync(`kill -${sig} ${pid}`);
            }
            return true;
        } catch (error) {
            console.error(`[ProcessMonitor] killProcess(${pid}) error:`, error);
            return false;
        }
    }

    /* ── 私有：Unix 进程列表 ──────────────────────────────────────── */

    private async getUnixProcessList(): Promise<ProcessInfo[]> {
        try {
            const totalMem = await this.getSystemMemoryBytes();

            let rawLines: string[];
            if (this.platform === 'darwin') {
                const { stdout } = await execAsync('ps -A -o pid,ppid,comm,%cpu,%mem,state,etime,user');
                rawLines = stdout.trim().split('\n').slice(1); // 去掉表头
            } else {
                const { stdout } = await execAsync('ps -eo pid,ppid,comm,%cpu,%mem,state,etime,user --no-headers');
                rawLines = stdout.trim().split('\n');
            }

            const processes: ProcessInfo[] = [];
            for (const line of rawLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const parts = trimmed.split(/\s+/);
                if (parts.length < 8) continue;

                const [pid, ppid, name, cpu, mem, state, etime, user, ...cmdParts] = parts;
                try {
                    const cpuNum = parseFloat(cpu);
                    const memNum = parseFloat(mem);
                    processes.push({
                        pid: parseInt(pid, 10),
                        ppid: parseInt(ppid, 10),
                        name,
                        command: cmdParts.join(' ') || '',
                        cpuPercent: isNaN(cpuNum) ? 0 : cpuNum,
                        memoryBytes: isNaN(memNum) ? 0 : Math.floor((memNum / 100) * totalMem),
                        status: this.parseProcessState(state),
                        startTime: this.parseEtime(etime),
                        user,
                    });
                } catch {
                    // 解析失败跳过
                }
            }
            return processes;
        } catch (error) {
            console.error('[ProcessMonitor] getUnixProcessList error:', error);
            return [];
        }
    }

    /* ── 私有：Windows 进程列表（PowerShell，不依赖 wmic）────────── */

    private async getWindowsProcessList(): Promise<ProcessInfo[]> {
        /**
         * PowerShell Get-Process 输出 CSV：
         *   Id, SI, Handles, VM, WS, PM, NPM, Path, Company, CPU,
         *   FileVersion, ProductVersion, Description, Product, __NounName,
         *   Name, BasePriority, ExitCode, HasExited, Handle, ...
         * 我们只需要：Id, Name, CPU, WS（WorkingSet = 内存字节）
         *
         * 额外通过 Get-CimInstance Win32_Process 获取 ParentProcessId
         * 和 CreationDate（startTime）。
         */
        const psScript = `
$procs = Get-Process | Select-Object Id,Name,CPU,WorkingSet,@{n='StartTime';e={if($_.StartTime){$_.StartTime.ToString('o')}else{''}}}
$parents = @{}
Get-CimInstance Win32_Process | ForEach-Object { $parents[$_.ProcessId] = $_.ParentProcessId }
$procs | ForEach-Object {
    $ppid = if($parents.ContainsKey($_.Id)){$parents[$_.Id]}else{0}
    "$($_.Id),$($_.Name),$([math]::Round($_.CPU,2)),$($_.WorkingSet),$ppid,$($_.StartTime)"
}
`.trim();

        try {
            const { stdout } = await execAsync(
                `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
                { timeout: 10_000 },
            );

            const processes: ProcessInfo[] = [];
            for (const line of stdout.trim().split('\n')) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const parts = trimmed.split(',');
                if (parts.length < 5) continue;

                const [pidStr, name, cpuStr, wsStr, ppidStr, startTimeStr] = parts;
                const pid = parseInt(pidStr, 10);
                const ppid = parseInt(ppidStr ?? '0', 10);
                const cpuSeconds = parseFloat(cpuStr ?? '0');
                const ws = parseInt(wsStr ?? '0', 10);

                if (isNaN(pid)) continue;

                processes.push({
                    pid,
                    ppid: isNaN(ppid) ? 0 : ppid,
                    name: name?.trim() ?? '',
                    cpuPercent: isNaN(cpuSeconds) ? 0 : cpuSeconds, // CPU 累计秒数（近似）
                    memoryBytes: isNaN(ws) ? 0 : ws,
                    status: 'running',
                    startTime: startTimeStr?.trim() ? new Date(startTimeStr.trim()) : new Date(),
                });
            }
            return processes;
        } catch (error) {
            console.error('[ProcessMonitor] getWindowsProcessList (PowerShell) error:', error);
            return [];
        }
    }

    /* ── 私有：系统统计 ───────────────────────────────────────────── */

    /**
     * macOS 系统统计
     * - 内存：sysctl hw.memsize（真实物理内存总量）
     * - CPU：top -l2 -n0 取第 2 次采样（避免第 1 次永远是 idle=100）
     */
    private async getMacOSStats(): Promise<SystemStats> {
        // ── 总内存（sysctl） ──
        const totalMem = await this.getSystemMemoryBytes();

        // ── 已用内存（vm_stat） ──
        let memoryUsed = 0;
        try {
            const { stdout: vmStat } = await execAsync('vm_stat');
            let pageSize = 4096;
            let activePages = 0;
            let inactivePages = 0;
            let wiredPages = 0;
            let compressedPages = 0;

            for (const line of vmStat.split('\n')) {
                const m = line.match(/([^:]+):\s*([\d.]+)/);
                if (!m) continue;
                const [, key, val] = m;
                const n = parseInt(val, 10);
                if (key.includes('page size of')) pageSize = n;
                else if (key.includes('Pages active')) activePages = n;
                else if (key.includes('Pages inactive')) inactivePages = n;
                else if (key.includes('Pages wired down')) wiredPages = n;
                else if (key.includes('Pages occupied by compressor')) compressedPages = n;
            }
            // 已用 = active + wired + compressed（不含 inactive，inactive 可被换出）
            memoryUsed = (activePages + wiredPages + compressedPages) * pageSize;
        } catch (error) {
            console.error('[ProcessMonitor] getMacOSStats vm_stat error:', error);
        }

        // ── CPU 使用率（top 双采样） ──
        let cpuTotal = 0;
        try {
            // -l2 采样两次，-n0 不输出进程列表，取第 2 组 CPU 行
            const { stdout: topOut } = await execAsync('top -l2 -n0 -s1', { timeout: 5000 });
            // 格式：CPU usage: 12.34% user, 5.67% sys, 82.00% idle
            const matches = [...topOut.matchAll(/CPU usage:\s*([\d.]+)%\s*user,\s*([\d.]+)%\s*sys/g)];
            if (matches.length >= 1) {
                const last = matches[matches.length - 1];
                const user = parseFloat(last[1] ?? '0');
                const sys = parseFloat(last[2] ?? '0');
                cpuTotal = isNaN(user + sys) ? 0 : user + sys;
            }
        } catch (error) {
            console.error('[ProcessMonitor] getMacOSStats top error:', error);
        }

        return {
            cpuTotal,
            memoryTotal: totalMem,
            memoryUsed,
            uptime: os.uptime(),
        };
    }

    /**
     * Linux 系统统计
     * - CPU：/proc/stat 双快照（间隔 200ms）
     * - 内存：/proc/meminfo
     * - uptime：/proc/uptime
     */
    private async getLinuxStats(): Promise<SystemStats> {
        // ── CPU（双快照） ──
        let cpuTotal = 0;
        try {
            const snap1 = await readLinuxCpuSnapshot();
            await new Promise((r) => setTimeout(r, 200));
            const snap2 = await readLinuxCpuSnapshot();

            const deltaTotal = snap2.total - snap1.total;
            const deltaIdle = snap2.idle - snap1.idle;
            if (deltaTotal > 0) {
                cpuTotal = Math.max(0, ((deltaTotal - deltaIdle) / deltaTotal) * 100);
            }
        } catch (error) {
            console.error('[ProcessMonitor] getLinuxStats /proc/stat error:', error);
        }

        // ── 内存 ──
        let memoryTotal = 0;
        let memoryUsed = 0;
        try {
            const raw = await fs.readFile('/proc/meminfo', 'utf8');
            const meminfo: Record<string, number> = {};
            for (const line of raw.split('\n')) {
                const m = line.match(/^(\S+):\s*(\d+)\s*kB/);
                if (m) meminfo[m[1]] = parseInt(m[2], 10) * 1024;
            }
            memoryTotal = meminfo['MemTotal'] ?? 0;
            const free = meminfo['MemFree'] ?? 0;
            const buffers = meminfo['Buffers'] ?? 0;
            const cached = (meminfo['Cached'] ?? 0) + (meminfo['SReclaimable'] ?? 0);
            memoryUsed = memoryTotal - free - buffers - cached;
        } catch (error) {
            console.error('[ProcessMonitor] getLinuxStats /proc/meminfo error:', error);
        }

        // ── uptime（/proc/uptime） ──
        let uptime = os.uptime();
        try {
            const raw = await fs.readFile('/proc/uptime', 'utf8');
            uptime = parseFloat(raw.trim().split(' ')[0] ?? '0');
        } catch {
            // 回退到 os.uptime()
        }

        return { cpuTotal, memoryTotal, memoryUsed, uptime };
    }

    /**
     * Windows 系统统计（PowerShell，不依赖 wmic）
     */
    private async getWindowsStats(): Promise<SystemStats> {
        const psScript = `
$os = Get-CimInstance Win32_OperatingSystem
$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
[PSCustomObject]@{
    TotalMemKB = $os.TotalVisibleMemorySize
    FreeMemKB  = $os.FreePhysicalMemory
    UptimeSec  = [math]::Round((Get-Date).Subtract($os.LastBootUpTime).TotalSeconds)
    CpuPct     = $cpu
} | ConvertTo-Csv -NoTypeInformation
`.trim();

        try {
            const { stdout } = await execAsync(
                `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
                { timeout: 10_000 },
            );

            const lines = stdout.trim().split('\n');
            if (lines.length >= 2) {
                // 第 1 行是 header，第 2 行是数据
                const headers = lines[0].replace(/"/g, '').split(',');
                const values = lines[1].replace(/"/g, '').split(',');
                const row: Record<string, string> = {};
                headers.forEach((h, i) => (row[h.trim()] = (values[i] ?? '').trim()));

                const totalMem = parseInt(row['TotalMemKB'] ?? '0', 10) * 1024;
                const freeMem = parseInt(row['FreeMemKB'] ?? '0', 10) * 1024;
                const uptime = parseFloat(row['UptimeSec'] ?? '0');
                const cpuTotal = parseFloat(row['CpuPct'] ?? '0');

                return {
                    cpuTotal: isNaN(cpuTotal) ? 0 : cpuTotal,
                    memoryTotal: isNaN(totalMem) ? 0 : totalMem,
                    memoryUsed: isNaN(totalMem) || isNaN(freeMem) ? 0 : totalMem - freeMem,
                    uptime: isNaN(uptime) ? os.uptime() : uptime,
                };
            }
        } catch (error) {
            console.error('[ProcessMonitor] getWindowsStats (PowerShell) error:', error);
        }

        return { cpuTotal: 0, memoryTotal: 0, memoryUsed: 0, uptime: os.uptime() };
    }

    /* ── 私有：工具方法 ───────────────────────────────────────────── */

    /**
     * 获取系统物理内存总量（字节），带缓存
     * - macOS: sysctl hw.memsize
     * - Linux: /proc/meminfo MemTotal
     * - Windows: os.totalmem()
     */
    private async getSystemMemoryBytes(): Promise<number> {
        if (this.cachedTotalMemory !== null) return this.cachedTotalMemory;

        let total = os.totalmem(); // 通用兜底

        try {
            if (this.platform === 'darwin') {
                const { stdout } = await execAsync('sysctl -n hw.memsize');
                const parsed = parseInt(stdout.trim(), 10);
                if (!isNaN(parsed) && parsed > 0) total = parsed;
            } else if (this.platform === 'linux') {
                const raw = await fs.readFile('/proc/meminfo', 'utf8');
                const m = raw.match(/^MemTotal:\s*(\d+)\s*kB/m);
                if (m) total = parseInt(m[1], 10) * 1024;
            }
            // Windows: os.totalmem() 已足够准确
        } catch (error) {
            console.error('[ProcessMonitor] getSystemMemoryBytes error, using os.totalmem():', error);
        }

        this.cachedTotalMemory = total;
        return total;
    }

    /**
     * 解析进程状态字符
     */
    private parseProcessState(state: string): ProcessStatus {
        const first = state?.[0] ?? '';
        const stateMap: Record<string, ProcessStatus> = {
            R: 'running',
            S: 'sleeping',
            I: 'idle',
            D: 'idle', // Uninterruptible sleep（Linux）
            T: 'stopped',
            t: 'stopped', // Stopped by debugger
            Z: 'zombie',
        };
        return stateMap[first] ?? 'idle';
    }

    /**
     * 解析 ps etime 字段为 Date
     *
     * 格式（man ps）：[[dd-]hh:]mm:ss
     *   ss          → < 1 min
     *   mm:ss       → < 1 hour
     *   hh:mm:ss    → < 1 day
     *   dd-hh:mm:ss → ≥ 1 day   ← 之前漏掉的格式
     */
    private parseEtime(etime: string): Date {
        if (!etime) return new Date();

        let totalSeconds = 0;

        // 拆分 days
        let rest = etime;
        const dayMatch = rest.match(/^(\d+)-(.+)$/);
        if (dayMatch) {
            totalSeconds += parseInt(dayMatch[1], 10) * 86400;
            rest = dayMatch[2];
        }

        const timeParts = rest.split(':').map((p) => parseInt(p, 10));
        if (timeParts.length === 3) {
            // hh:mm:ss
            totalSeconds += (timeParts[0] ?? 0) * 3600 + (timeParts[1] ?? 0) * 60 + (timeParts[2] ?? 0);
        } else if (timeParts.length === 2) {
            // mm:ss
            totalSeconds += (timeParts[0] ?? 0) * 60 + (timeParts[1] ?? 0);
        } else if (timeParts.length === 1) {
            // ss
            totalSeconds += timeParts[0] ?? 0;
        }

        const startTime = new Date();
        startTime.setTime(startTime.getTime() - totalSeconds * 1000);
        return startTime;
    }
}

// 导出单例
export const processMonitor = new ProcessMonitor();
