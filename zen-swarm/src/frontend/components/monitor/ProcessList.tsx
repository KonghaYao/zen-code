/**
 * 进程列表组件
 */

import type { ProcessInfo, ProcessStatus, MonitorTab } from './types.js';
import { formatBytes, formatPercent, formatUptime } from './utils.js';

interface ProcessListProps {
    processes: ProcessInfo[];
    activeTab: MonitorTab;
    selectedPid: number | null;
    onProcessSelect: (pid: number) => void;
    sortBy: keyof ProcessInfo;
    sortOrder: 'asc' | 'desc';
    onSort: (key: keyof ProcessInfo) => void;
}

const STATUS_COLORS: Record<ProcessStatus, string> = {
    running: 'text-green-500',
    sleeping: 'text-amber-500',
    idle: 'text-gray-500',
    stopped: 'text-red-500',
    zombie: 'text-violet-600',
};

const STATUS_LABELS: Record<ProcessStatus, string> = {
    running: '运行中',
    sleeping: '睡眠',
    idle: '空闲',
    stopped: '已停止',
    zombie: '僵尸',
};

export function ProcessList({
    processes,
    activeTab,
    selectedPid,
    onProcessSelect,
    sortBy,
    sortOrder,
    onSort,
}: ProcessListProps) {
    // 过滤进程（根据标签页显示不同数据）
    const filteredProcesses = processes.filter((proc) => {
        if (activeTab === 'agents') {
            // Agents 标签页只显示 zen-swarm 相关进程
            return proc.agentType !== undefined;
        }
        return true;
    });

    // 定义列
    const columns = [
        { key: 'pid' as keyof ProcessInfo, label: 'PID', width: 'w-20' },
        { key: 'name' as keyof ProcessInfo, label: '名称', width: 'flex-1' },
        { key: 'cpuPercent' as keyof ProcessInfo, label: 'CPU %', width: 'w-24' },
        { key: 'memoryBytes' as keyof ProcessInfo, label: '内存', width: 'w-24' },
        { key: 'status' as keyof ProcessInfo, label: '状态', width: 'w-24' },
        { key: 'agentType' as keyof ProcessInfo, label: '类型', width: 'w-20' },
    ];

    const renderSortIcon = (key: keyof ProcessInfo) => {
        if (sortBy !== key) return null;
        return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="bg-white border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
            {/* 表头 */}
            <div className="flex items-center px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                {columns.map((col) => (
                    <button
                        key={col.key}
                        onClick={() => onSort(col.key)}
                        className={`${col.width} px-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors`}
                    >
                        {col.label}
                        {renderSortIcon(col.key)}
                    </button>
                ))}
            </div>

            {/* 进程列表 */}
            <div className="divide-y divide-[var(--color-border-subtle)]">
                {filteredProcesses.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">没有找到进程</div>
                ) : (
                    filteredProcesses.map((proc) => (
                        <ProcessRow
                            key={proc.pid}
                            process={proc}
                            isSelected={proc.pid === selectedPid}
                            onSelect={() => onProcessSelect(proc.pid)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface ProcessRowProps {
    process: ProcessInfo;
    isSelected: boolean;
    onSelect: () => void;
}

function ProcessRow({ process, isSelected, onSelect }: ProcessRowProps) {
    return (
        <div
            onClick={onSelect}
            className={`flex items-center px-4 py-3 hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors ${
                isSelected ? 'bg-[var(--color-bg-secondary)]' : ''
            }`}
        >
            <div className="w-20 px-2 text-sm font-mono text-[var(--color-text-primary)]">{process.pid}</div>
            <div className="flex-1 px-2 text-sm text-[var(--color-text-primary)] truncate">{process.name}</div>
            <div className="w-24 px-2 text-sm">
                <CPUBar percent={process.cpuPercent} />
            </div>
            <div className="w-24 px-2 text-sm text-[var(--color-text-primary)]">{formatBytes(process.memoryBytes)}</div>
            <div className="w-24 px-2 text-sm">
                <span className={STATUS_COLORS[process.status]}>{STATUS_LABELS[process.status]}</span>
            </div>
            <div className="w-20 px-2 text-sm text-[var(--color-text-muted)]">{process.agentType || '-'}</div>
        </div>
    );
}

function CPUBar({ percent }: { percent: number }) {
    const getColor = () => {
        if (percent < 30) return 'bg-green-500';
        if (percent < 70) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-2">
            <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-1.5 overflow-hidden">
                <div
                    className={`${getColor()} h-full transition-all duration-300`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <span className="text-xs text-[var(--color-text-muted)] w-10 text-right">{formatPercent(percent)}</span>
        </div>
    );
}
