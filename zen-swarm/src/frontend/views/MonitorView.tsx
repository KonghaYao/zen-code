/**
 * 监控面板主视图
 */

import { useEffect, useMemo } from 'react';
import { useMonitorStore } from '../stores/monitorStore.js';
import { MonitorTabs } from '../components/monitor/MonitorTabs.js';
import { ProcessToolbar } from '../components/monitor/ProcessToolbar.js';
import { ProcessList } from '../components/monitor/ProcessList.js';
import { ProcessDetail } from '../components/monitor/ProcessDetail.js';
import { ProcessLog } from '../components/monitor/ProcessLog.js';
import { ProcessTree } from '../components/monitor/ProcessTree.js';

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
        showLogPanel,
        showTreePanel,
        processTree,
        setActiveTab,
        setViewMode,
        setSearchQuery,
        setSortBy,
        setSelectedPid,
        refreshProcesses,
        killProcess,
        fetchLogs,
        toggleLogPanel,
        toggleTreePanel,
        fetchProcessTree,
    } = useMonitorStore();

    // 初始加载
    useEffect(() => {
        refreshProcesses();
        // 每2秒自动刷新
        const interval = setInterval(() => {
            refreshProcesses();
        }, 2000);
        return () => clearInterval(interval);
    }, [viewMode, refreshProcesses]);

    // 选中进程时获取日志
    useEffect(() => {
        if (selectedPid !== null && showLogPanel) {
            fetchLogs(selectedPid);
        }
    }, [selectedPid, showLogPanel, fetchLogs]);

    // 选中进程时获取进程树
    useEffect(() => {
        if (selectedPid !== null && showTreePanel) {
            fetchProcessTree(selectedPid);
        }
    }, [selectedPid, showTreePanel, fetchProcessTree]);

    // 过滤和排序进程
    const sortedProcesses = useMemo(() => {
        let filtered = processes;

        // 搜索过滤
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (proc) =>
                    proc.name.toLowerCase().includes(query) ||
                    proc.command?.toLowerCase().includes(query) ||
                    proc.pid.toString().includes(query),
            );
        }

        // 排序
        return [...filtered].sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return 0;
        });
    }, [processes, searchQuery, sortBy, sortOrder]);

    // 获取选中的进程
    const selectedProcess = useMemo(() => {
        return processes.find((p) => p.pid === selectedPid) || null;
    }, [processes, selectedPid]);

    // 获取当前进程的日志
    const currentLogs = selectedPid !== null ? logs[selectedPid] || [] : [];

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* 标签页 */}
            <MonitorTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* 工具栏 */}
            <ProcessToolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onRefresh={refreshProcesses}
                isLoading={isLoading}
            />

            {/* 错误提示 */}
            {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
            )}

            {/* 进程列表 */}
            <div className="flex-1 overflow-hidden">
                <ProcessList
                    processes={sortedProcesses}
                    activeTab={activeTab}
                    selectedPid={selectedPid}
                    onProcessSelect={setSelectedPid}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={setSortBy}
                />
            </div>

            {/* 详情面板 */}
            {selectedProcess && (
                <ProcessDetail
                    process={selectedProcess}
                    onKillProcess={() => selectedPid && killProcess(selectedPid)}
                    onToggleLog={toggleLogPanel}
                    onToggleTree={toggleTreePanel}
                />
            )}

            {/* 日志面板 */}
            {showLogPanel && selectedPid !== null && <ProcessLog logs={currentLogs} isLoading={isLoading} />}

            {/* 进程树面板 */}
            {showTreePanel && <ProcessTree tree={processTree} isLoading={isLoading} />}
        </div>
    );
}

export default MonitorView;
