/**
 * 监控面板主视图 — 重设计版
 * 布局：顶部 Tab + 搜索栏 / 左侧进程列表 / 右侧详情面板
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { useMonitorStore } from '../stores/monitorStore.js';
import type { MonitorTab, MonitorView, ProcessInfo, ProcessTreeNode } from '../components/monitor/types.js';
import { formatBytes, formatPercent, formatUptime } from '../components/monitor/utils.js';
import { IconButton } from '../components/ui/IconButton.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

type DetailTab = 'info' | 'logs' | 'tree';

const MONITOR_TABS: { id: MonitorTab; label: string; sortKey: keyof ProcessInfo }[] = [
    { id: 'cpu', label: 'CPU', sortKey: 'cpuPercent' },
    { id: 'memory', label: 'Memory', sortKey: 'memoryBytes' },
    { id: 'energy', label: 'Energy', sortKey: 'cpuPercent' },
    { id: 'disk', label: 'Disk', sortKey: 'diskRead' },
    { id: 'network', label: 'Network', sortKey: 'networkIn' },
    { id: 'agents', label: 'Agents', sortKey: 'status' },
];

const STATUS_DOT: Record<string, string> = {
    running: 'bg-success',
    sleeping: 'bg-warning',
    idle: 'bg-neutral-300',
    stopped: 'bg-error',
    zombie: 'bg-violet-500',
};

const STATUS_LABEL: Record<string, string> = {
    running: '运行中',
    sleeping: '睡眠',
    idle: '空闲',
    stopped: '已停止',
    zombie: '僵尸',
};

/* ------------------------------------------------------------------ */
/*  Main view                                                           */
/* ------------------------------------------------------------------ */

export function MonitorView() {
    const {
        activeTab,
        viewMode,
        searchQuery,
        sortBy,
        sortOrder,
        processes,
        selectedPid,
        isLoading,
        error,
        logs,
        processTree,
        setActiveTab,
        setViewMode,
        setSearchQuery,
        setSortBy,
        setSelectedPid,
        refreshProcesses,
        killProcess,
        fetchLogs,
        fetchProcessTree,
    } = useMonitorStore();

    const [detailTab, setDetailTab] = useState<DetailTab>('info');

    // 初始加载 + 自动刷新
    useEffect(() => {
        refreshProcesses();
        const id = setInterval(refreshProcesses, 2000);
        return () => clearInterval(id);
    }, [refreshProcesses]);

    // 切到 logs 标签时拉取日志
    useEffect(() => {
        if (selectedPid !== null && detailTab === 'logs') {
            fetchLogs(selectedPid);
        }
    }, [selectedPid, detailTab, fetchLogs]);

    // 切到 tree 标签时拉取进程树
    useEffect(() => {
        if (selectedPid !== null && detailTab === 'tree') {
            fetchProcessTree(selectedPid);
        }
    }, [selectedPid, detailTab, fetchProcessTree]);

    // 过滤 + 排序
    const filteredProcesses = useMemo(() => {
        let list = processes;

        if (activeTab === 'agents') {
            list = list.filter((p) => p.agentType !== undefined);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.command?.toLowerCase().includes(q) ||
                    p.pid.toString().includes(q),
            );
        }

        return [...list].sort((a, b) => {
            const av = a[sortBy] as number | string;
            const bv = b[sortBy] as number | string;
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortOrder === 'asc' ? av - bv : bv - av;
            }
            if (typeof av === 'string' && typeof bv === 'string') {
                return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return 0;
        });
    }, [processes, searchQuery, sortBy, sortOrder, activeTab]);

    const selectedProcess = useMemo(
        () => processes.find((p) => p.pid === selectedPid) ?? null,
        [processes, selectedPid],
    );

    const currentLogs = selectedPid !== null ? (logs[selectedPid] ?? []) : [];

    const handleTabChange = (tab: MonitorTab) => {
        const found = MONITOR_TABS.find((t) => t.id === tab);
        if (found) setSortBy(found.sortKey);
        setActiveTab(tab);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-bg-primary">
            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex-shrink-0 px-3 md:px-5 pt-3 md:pt-5 pb-2 md:pb-3 border-b border-border-subtle bg-bg-secondary">
                <div className="flex items-center justify-between gap-2 md:gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <h1 className="text-lg font-semibold text-text-primary">Monitor</h1>
                        {/* 视图切换 */}
                        <div className="flex rounded-lg border border-border-subtle overflow-hidden text-xs">
                            {(['zen-swarm', 'system'] as MonitorView[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`px-3 py-1.5 font-medium transition-colors ${
                                        viewMode === m
                                            ? 'bg-primary text-white'
                                            : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                                    }`}
                                >
                                    {m === 'zen-swarm' ? 'Zen-Swarm' : 'System'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <div className="relative flex-1">
                            <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索进程…"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border-subtle rounded-lg bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <IconButton
                            onClick={refreshProcesses}
                            disabled={isLoading}
                            title="刷新"
                            className="border border-border-subtle"
                        >
                            <svg
                                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M8 16H3v5" />
                            </svg>
                        </IconButton>
                    </div>
                </div>

                {/* Monitor tabs */}
                <div className="flex gap-1 mt-3">
                    {MONITOR_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Error banner ─────────────────────────────────── */}
            {error && (
                <div className="flex-shrink-0 mx-4 mt-2 px-3 py-2 text-xs text-error bg-error-light border border-error/20 rounded-lg">
                    {error}
                </div>
            )}

            {/* ── Body: list + detail ───────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Process list */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden md:border-r border-border-subtle">
                    <ProcessTable
                        processes={filteredProcesses}
                        activeTab={activeTab}
                        selectedPid={selectedPid}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSelect={setSelectedPid}
                        onSort={setSortBy}
                    />
                </div>

                {/* Right: Detail panel - 移动端隐藏 */}
                <div className="hidden md:flex w-80 flex-shrink-0 flex-col overflow-hidden bg-bg-secondary">
                    {selectedProcess ? (
                        <DetailPanel
                            process={selectedProcess}
                            detailTab={detailTab}
                            onDetailTabChange={setDetailTab}
                            logs={currentLogs}
                            tree={processTree}
                            isLoading={isLoading}
                            onKill={() => selectedPid && killProcess(selectedPid)}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2 p-6">
                            <svg
                                className="w-10 h-10 opacity-30"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18M9 21V9" />
                            </svg>
                            <p className="text-sm">选择一个进程查看详情</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Process Table                                                       */
/* ------------------------------------------------------------------ */

interface ProcessTableProps {
    processes: ProcessInfo[];
    activeTab: MonitorTab;
    selectedPid: number | null;
    sortBy: keyof ProcessInfo;
    sortOrder: 'asc' | 'desc';
    onSelect: (pid: number) => void;
    onSort: (key: keyof ProcessInfo) => void;
}

const COLUMNS: { key: keyof ProcessInfo; label: string; className: string; tabs?: MonitorTab[] }[] = [
    { key: 'pid', label: 'PID', className: 'w-16 text-right' },
    { key: 'name', label: 'Name', className: 'flex-1' },
    { key: 'cpuPercent', label: 'CPU', className: 'w-28', tabs: ['cpu', 'energy', 'agents'] },
    { key: 'memoryBytes', label: 'Memory', className: 'w-24', tabs: ['memory', 'agents', 'cpu'] },
    { key: 'diskRead', label: 'Disk R', className: 'w-20', tabs: ['disk'] },
    { key: 'diskWrite', label: 'Disk W', className: 'w-20', tabs: ['disk'] },
    { key: 'networkIn', label: 'Net ↓', className: 'w-20', tabs: ['network'] },
    { key: 'networkOut', label: 'Net ↑', className: 'w-20', tabs: ['network'] },
    { key: 'status', label: 'Status', className: 'w-20' },
];

function visibleColumns(tab: MonitorTab) {
    return COLUMNS.filter((col) => !col.tabs || col.tabs.includes(tab));
}

function ProcessTable({ processes, activeTab, selectedPid, sortBy, sortOrder, onSelect, onSort }: ProcessTableProps) {
    const cols = visibleColumns(activeTab);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Table head */}
            <div className="flex items-center px-3 py-2 border-b border-border-subtle bg-bg-tertiary flex-shrink-0">
                {cols.map((col) => (
                    <button
                        key={col.key}
                        onClick={() => onSort(col.key)}
                        className={`${col.className} flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors px-1`}
                    >
                        {col.label}
                        {sortBy === col.key && <span className="text-primary">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                ))}
            </div>

            {/* Table body */}
            <div className="flex-1 overflow-y-auto">
                {processes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-text-muted">没有找到进程</div>
                ) : (
                    processes.map((proc) => (
                        <ProcessRow
                            key={proc.pid}
                            process={proc}
                            cols={cols}
                            activeTab={activeTab}
                            isSelected={proc.pid === selectedPid}
                            onSelect={() => onSelect(proc.pid)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

interface ProcessRowProps {
    process: ProcessInfo;
    cols: typeof COLUMNS;
    activeTab: MonitorTab;
    isSelected: boolean;
    onSelect: () => void;
}

function ProcessRow({ process, cols, isSelected, onSelect }: ProcessRowProps) {
    const renderCell = (key: keyof ProcessInfo, className: string) => {
        switch (key) {
            case 'pid':
                return (
                    <div key={key} className={`${className} px-1 font-mono text-xs text-text-muted`}>
                        {process.pid}
                    </div>
                );
            case 'name':
                return (
                    <div key={key} className={`${className} px-1`}>
                        <span className="text-sm text-text-primary truncate block">{process.name}</span>
                        {process.agentType && (
                            <span className="text-xs text-primary font-medium">{process.agentType}</span>
                        )}
                    </div>
                );
            case 'cpuPercent':
                return (
                    <div key={key} className={`${className} px-1`}>
                        <CpuBar percent={process.cpuPercent} />
                    </div>
                );
            case 'memoryBytes':
                return (
                    <div key={key} className={`${className} px-1 text-xs text-text-secondary`}>
                        {formatBytes(process.memoryBytes)}
                    </div>
                );
            case 'diskRead':
                return (
                    <div key={key} className={`${className} px-1 text-xs text-text-secondary`}>
                        {process.diskRead !== undefined ? formatBytes(process.diskRead) : '—'}
                    </div>
                );
            case 'diskWrite':
                return (
                    <div key={key} className={`${className} px-1 text-xs text-text-secondary`}>
                        {process.diskWrite !== undefined ? formatBytes(process.diskWrite) : '—'}
                    </div>
                );
            case 'networkIn':
                return (
                    <div key={key} className={`${className} px-1 text-xs text-text-secondary`}>
                        {process.networkIn !== undefined ? formatBytes(process.networkIn) : '—'}
                    </div>
                );
            case 'networkOut':
                return (
                    <div key={key} className={`${className} px-1 text-xs text-text-secondary`}>
                        {process.networkOut !== undefined ? formatBytes(process.networkOut) : '—'}
                    </div>
                );
            case 'status':
                return (
                    <div key={key} className={`${className} px-1 flex items-center gap-1.5`}>
                        <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[process.status] ?? 'bg-neutral-300'}`}
                        />
                        <span className="text-xs text-text-secondary">
                            {STATUS_LABEL[process.status] ?? process.status}
                        </span>
                    </div>
                );
            default:
                return <div key={key} className={`${className} px-1`} />;
        }
    };

    return (
        <div
            onClick={onSelect}
            className={`flex items-center px-3 py-2 cursor-pointer transition-colors border-b border-border-subtle/50 hover:bg-bg-tertiary ${
                isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
            }`}
        >
            {cols.map((col) => renderCell(col.key, col.className))}
        </div>
    );
}

function CpuBar({ percent }: { percent: number }) {
    const color = percent < 30 ? 'bg-success' : percent < 70 ? 'bg-warning' : 'bg-error';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-bg-tertiary rounded-full h-1 overflow-hidden">
                <div
                    className={`${color} h-full transition-all duration-500`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <span className="text-xs text-text-muted w-9 text-right tabular-nums">{formatPercent(percent)}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Detail Panel                                                        */
/* ------------------------------------------------------------------ */

interface DetailPanelProps {
    process: ProcessInfo;
    detailTab: DetailTab;
    onDetailTabChange: (t: DetailTab) => void;
    logs: string[];
    tree: ProcessTreeNode | null;
    isLoading: boolean;
    onKill: () => void;
}

function DetailPanel({ process, detailTab, onDetailTabChange, logs, tree, isLoading, onKill }: DetailPanelProps) {
    const DETAIL_TABS: { id: DetailTab; label: string }[] = [
        { id: 'info', label: 'Info' },
        { id: 'logs', label: 'Logs' },
        { id: 'tree', label: 'Tree' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Detail header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border-subtle">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-text-primary truncate">{process.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">PID {process.pid}</p>
                    </div>
                    <button
                        onClick={onKill}
                        className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-error bg-error-light hover:bg-red-100 rounded-md transition-colors"
                    >
                        终止
                    </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                    <StatBadge label="CPU" value={formatPercent(process.cpuPercent)} />
                    <StatBadge label="内存" value={formatBytes(process.memoryBytes)} />
                    <StatBadge label="运行" value={formatUptime(process.startTime)} />
                </div>

                {/* Detail tab bar */}
                <div className="flex gap-1 mt-3">
                    {DETAIL_TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onDetailTabChange(t.id)}
                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                                detailTab === t.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Detail content */}
            <div className="flex-1 overflow-y-auto">
                {detailTab === 'info' && <InfoTab process={process} />}
                {detailTab === 'logs' && <LogsTab logs={logs} isLoading={isLoading} />}
                {detailTab === 'tree' && <TreeTab tree={tree} isLoading={isLoading} />}
            </div>
        </div>
    );
}

function StatBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-bg-tertiary rounded-lg px-2 py-1.5 text-center">
            <p className="text-xs text-text-muted leading-none mb-1">{label}</p>
            <p className="text-xs font-semibold text-text-primary tabular-nums">{value}</p>
        </div>
    );
}

/* ── Info tab ─────────────────────────────────────────────────────── */

function InfoTab({ process }: { process: ProcessInfo }) {
    const rows: [string, string | undefined][] = [
        ['PPID', process.ppid?.toString()],
        ['用户', process.user],
        ['Agent Type', process.agentType],
        ['Task ID', process.taskId],
        ['Agent ID', process.agentId],
        ['Disk 读', process.diskRead !== undefined ? formatBytes(process.diskRead) : undefined],
        ['Disk 写', process.diskWrite !== undefined ? formatBytes(process.diskWrite) : undefined],
        ['Net ↓', process.networkIn !== undefined ? formatBytes(process.networkIn) : undefined],
        ['Net ↑', process.networkOut !== undefined ? formatBytes(process.networkOut) : undefined],
    ];

    return (
        <div className="p-4 space-y-3">
            {/* Status badge */}
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[process.status] ?? 'bg-neutral-300'}`} />
                <span className="text-sm text-text-secondary">{STATUS_LABEL[process.status] ?? process.status}</span>
            </div>

            {/* Key-value rows */}
            <div className="divide-y divide-border-subtle/60">
                {rows
                    .filter(([, v]) => v !== undefined)
                    .map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center py-2">
                            <span className="text-xs text-text-muted">{label}</span>
                            <span className="text-xs text-text-primary font-medium">{value}</span>
                        </div>
                    ))}
            </div>

            {/* Command line */}
            {process.command && (
                <div className="mt-2">
                    <p className="text-xs text-text-muted mb-1.5">命令行</p>
                    <div className="bg-bg-tertiary rounded-lg p-3">
                        <code className="text-xs text-text-secondary break-all font-mono leading-relaxed">
                            {process.command}
                        </code>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Logs tab ─────────────────────────────────────────────────────── */

function LogsTab({ logs, isLoading }: { logs: string[]; isLoading: boolean }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [logs]);

    return (
        <div className="p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <span className="text-xs text-text-muted">{logs.length} 行</span>
                {isLoading && <span className="text-xs text-text-muted animate-pulse">加载中…</span>}
            </div>
            <div
                ref={ref}
                className="flex-1 overflow-y-auto bg-neutral-950 rounded-lg p-3 font-mono text-xs leading-relaxed"
            >
                {logs.length === 0 ? (
                    <p className="text-neutral-500">暂无日志</p>
                ) : (
                    logs.map((line, i) => (
                        <div key={i} className="text-neutral-300 break-all whitespace-pre-wrap py-0.5">
                            {line}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/* ── Tree tab ─────────────────────────────────────────────────────── */

function TreeTab({ tree, isLoading }: { tree: ProcessTreeNode | null; isLoading: boolean }) {
    return (
        <div className="p-3">
            {isLoading && <p className="text-xs text-text-muted animate-pulse mb-2">加载中…</p>}
            {tree ? <TreeNode node={tree} level={0} /> : <p className="text-xs text-text-muted">暂无进程树数据</p>}
        </div>
    );
}

function TreeNode({ node, level }: { node: ProcessTreeNode; level: number }) {
    const [open, setOpen] = useState(true);
    const hasChildren = node.children.length > 0;

    return (
        <div>
            <div
                className="flex items-center gap-1.5 py-1 rounded hover:bg-bg-tertiary px-1 cursor-pointer"
                style={{ paddingLeft: `${level * 14 + 4}px` }}
                onClick={() => hasChildren && setOpen((o) => !o)}
            >
                {hasChildren ? (
                    <span className="text-text-muted text-xs w-3">{open ? '▾' : '▸'}</span>
                ) : (
                    <span className="w-3" />
                )}
                <span className="font-mono text-xs text-text-muted w-10 flex-shrink-0">{node.pid}</span>
                <span className="text-xs text-text-primary flex-1 truncate">{node.name}</span>
                <span className="text-xs text-text-muted tabular-nums">{formatPercent(node.cpuPercent)}</span>
            </div>
            {open &&
                hasChildren &&
                node.children.map((child) => <TreeNode key={child.pid} node={child} level={level + 1} />)}
        </div>
    );
}

export default MonitorView;
