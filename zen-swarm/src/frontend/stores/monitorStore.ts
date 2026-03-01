/**
 * 进程监控 Zustand Store
 */

import { create } from 'zustand';
import { apiClient } from '../api.js';
import type { MonitorTab, MonitorView, ProcessInfo, ProcessTreeNode } from '../components/monitor/types.js';

const MAX_LOG_LINES = 500;

interface MonitorState {
    // 视图状态
    activeTab: MonitorTab;
    viewMode: MonitorView;
    searchQuery: string;
    sortBy: keyof ProcessInfo;
    sortOrder: 'asc' | 'desc';

    // 数据
    processes: ProcessInfo[];
    selectedPid: number | null;
    isLoading: boolean;
    error: string | null;

    // 日志
    logs: Record<number, string[]>;
    showLogPanel: boolean;
    showTreePanel: boolean;
    processTree: ProcessTreeNode | null;

    // 系统统计
    systemStats: {
        cpuTotal: number;
        memoryTotal: number;
        memoryUsed: number;
        uptime: number;
    } | null;

    // Actions
    setActiveTab: (tab: MonitorTab) => void;
    setViewMode: (mode: MonitorView) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (key: keyof ProcessInfo) => void;
    setSelectedPid: (pid: number | null) => void;
    refreshProcesses: () => Promise<void>;
    refreshSystemStats: () => Promise<void>;

    // 进程控制
    killProcess: (pid: number) => Promise<void>;

    // 日志
    fetchLogs: (pid: number) => Promise<void>;
    appendLog: (pid: number, line: string) => void;
    toggleLogPanel: () => void;
    toggleTreePanel: () => void;
    fetchProcessTree: (rootPid?: number) => Promise<void>;
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
    // 初始状态
    activeTab: 'cpu',
    viewMode: 'zen-swarm',
    searchQuery: '',
    sortBy: 'cpuPercent',
    sortOrder: 'desc',
    processes: [],
    selectedPid: null,
    isLoading: false,
    error: null,
    logs: {},
    showLogPanel: false,
    showTreePanel: false,
    processTree: null,
    systemStats: null,

    // 设置活动标签页
    setActiveTab: (tab) => {
        set({ activeTab: tab });

        // 根据标签页设置默认排序
        const defaultSortBy: Partial<Record<MonitorTab, keyof ProcessInfo>> = {
            cpu: 'cpuPercent',
            memory: 'memoryBytes',
            energy: 'cpuPercent', // 能耗基于 CPU 估算
            disk: 'diskRead',
            network: 'networkIn',
            agents: 'status',
        };

        set({ sortBy: defaultSortBy[tab] || 'pid', sortOrder: 'desc' });
    },

    // 设置视图模式
    setViewMode: (mode) => {
        set({ viewMode: mode });
        // 切换视图时刷新进程列表
        get().refreshProcesses();
    },

    // 设置搜索查询
    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    // 设置排序字段
    setSortBy: (key) => {
        const { sortBy, sortOrder } = get();
        set({
            sortBy: key,
            sortOrder: sortBy === key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc',
        });
    },

    // 设置选中进程
    setSelectedPid: (pid) => {
        set({ selectedPid: pid });
        // 选中进程时，如果日志面板打开，刷新日志
        if (pid !== null && get().showLogPanel) {
            get().fetchLogs(pid);
        }
    },

    // 刷新进程列表
    refreshProcesses: async () => {
        const { viewMode } = get();
        set({ isLoading: true, error: null });

        try {
            const processes = await apiClient.monitor.listProcesses.query({ view: viewMode });
            // 清理已消失进程的日志
            const activePids = new Set(processes.map((p) => p.pid));
            set((state) => {
                const cleanedLogs = Object.fromEntries(
                    Object.entries(state.logs).filter(([pid]) => activePids.has(Number(pid))),
                );
                return { processes, isLoading: false, logs: cleanedLogs };
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch processes',
                isLoading: false,
            });
        }
    },

    // 刷新系统统计
    refreshSystemStats: async () => {
        try {
            const stats = await apiClient.monitor.getSystemStats.query();
            set({ systemStats: stats });
        } catch (error: any) {
            console.error('Failed to fetch system stats:', error);
        }
    },

    // 终止进程
    killProcess: async (pid) => {
        set({ isLoading: true, error: null });

        try {
            const result = await apiClient.monitor.killProcess.mutate({
                pid,
                signal: 'SIGTERM',
            });

            if (result.success) {
                // 刷新进程列表
                await get().refreshProcesses();
                // 清除选中状态，并清理该进程的日志
                set((state) => {
                    const { [pid]: _, ...remainingLogs } = state.logs;
                    return { selectedPid: null, logs: remainingLogs };
                });
            } else {
                set({ error: 'Failed to kill process', isLoading: false });
            }
        } catch (error: any) {
            set({
                error: error.message || 'Failed to kill process',
                isLoading: false,
            });
        }
    },

    // 获取进程日志
    fetchLogs: async (pid) => {
        try {
            const logs = await apiClient.monitor.getProcessLogs.query({ pid, lines: 100 });
            set((state) => ({
                logs: { ...state.logs, [pid]: logs },
            }));
        } catch (error: any) {
            console.error(`Failed to fetch logs for process ${pid}:`, error);
        }
    },

    // 添加日志行（用于实时更新）
    appendLog: (pid, line) => {
        set((state) => {
            const prev = state.logs[pid] || [];
            const next = [...prev, line];
            const trimmed = next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
            return {
                logs: {
                    ...state.logs,
                    [pid]: trimmed,
                },
            };
        });
    },

    // 切换日志面板
    toggleLogPanel: () => {
        set((state) => ({ showLogPanel: !state.showLogPanel }));
    },

    // 切换进程树面板
    toggleTreePanel: () => {
        set((state) => ({ showTreePanel: !state.showTreePanel }));
    },

    // 获取进程树
    fetchProcessTree: async (rootPid) => {
        try {
            const tree = await apiClient.monitor.getProcessTree.query({ rootPid });
            set({ processTree: tree });
        } catch (error: any) {
            console.error('Failed to fetch process tree:', error);
        }
    },
}));
