/**
 * 进程详情面板组件
 */

import type { ProcessInfo, ProcessStatus } from './types.js';
import { formatBytes, formatPercent, formatUptime } from './utils.js';

interface ProcessDetailProps {
    process: ProcessInfo | null;
    onKillProcess: () => void;
    onToggleLog: () => void;
    onToggleTree: () => void;
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

export function ProcessDetail({ process, onKillProcess, onToggleLog, onToggleTree }: ProcessDetailProps) {
    if (!process) {
        return (
            <div className="bg-white border-t border-[var(--color-border-subtle)] p-6">
                <p className="text-center text-[var(--color-text-muted)]">选择一个进程查看详情</p>
            </div>
        );
    }

    return (
        <div className="bg-white border-t border-[var(--color-border-subtle)] p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{process.name}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">PID: {process.pid}</p>
                </div>
                <button
                    onClick={onKillProcess}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                >
                    ⏹️ 终止进程
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatItem label="CPU" value={formatPercent(process.cpuPercent)} />
                <StatItem label="内存" value={formatBytes(process.memoryBytes)} />
                <StatItem label="运行时间" value={formatUptime(process.startTime)} />
                <StatItem
                    label="状态"
                    value={<span className={STATUS_COLORS[process.status]}>{STATUS_LABELS[process.status]}</span>}
                />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
                <button
                    onClick={onToggleLog}
                    className="flex-1 px-4 py-2 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors"
                >
                    📋 查看日志
                </button>
                <button
                    onClick={onToggleTree}
                    className="flex-1 px-4 py-2 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors"
                >
                    🌳 进程树
                </button>
            </div>

            {/* 命令行 */}
            {process.command && (
                <div className="mt-4 p-3 bg-[var(--color-bg-tertiary)] rounded-md">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">命令行</p>
                    <code className="text-xs text-[var(--color-text-primary)] break-all">{process.command}</code>
                </div>
            )}
        </div>
    );
}

interface StatItemProps {
    label: string;
    value: string | React.ReactNode;
}

function StatItem({ label, value }: StatItemProps) {
    return (
        <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{value}</p>
        </div>
    );
}
