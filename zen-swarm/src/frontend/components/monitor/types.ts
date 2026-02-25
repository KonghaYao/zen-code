/**
 * 进程监控面板类型定义
 */

export type MonitorTab = 'cpu' | 'memory' | 'energy' | 'disk' | 'network' | 'agents';

export type MonitorView = 'zen-swarm' | 'system';

export type ProcessStatus = 'running' | 'sleeping' | 'idle' | 'stopped' | 'zombie';

export interface ProcessInfo {
    pid: number;
    ppid: number; // 父进程 ID
    name: string;
    command?: string; // 完整命令行
    cpuPercent: number;
    memoryBytes: number;
    status: ProcessStatus;
    startTime: string | Date; // 后端返回 string，前端可能是 Date
    user?: string;

    // 可选字段（某些标签页使用）
    diskRead?: number;
    diskWrite?: number;
    networkIn?: number;
    networkOut?: number;
    energyImpact?: number;

    // zen-swarm 专属
    agentType?: 'main' | 'agent' | 'task' | 'mcp';
    taskId?: string;
    agentId?: string;
}

export interface ProcessTreeNode extends ProcessInfo {
    children: ProcessTreeNode[];
}

export interface ProcessLogEntry {
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
}

export interface SystemStats {
    cpuTotal: number;
    memoryTotal: number;
    memoryUsed: number;
    uptime: number;
}
