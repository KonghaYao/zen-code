import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { UniversalPanel } from 'ink-pro';
import type { PanelConfig } from 'ink-pro';
import type { ProcessInfo } from '../../services/ProcessManagerService.js';
import { processManager } from '../../services/ProcessManagerService.js';
import ProcessOutputPanel from './ProcessOutputPanel.js';
import ErrorBoundary from '../common/ErrorBoundary';

interface ProcessPanelProps {
    onClose: () => void;
}

const ProcessPanel: React.FC<ProcessPanelProps> = ({ onClose }) => {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [outputPid, setOutputPid] = useState<number | null>(null);

    // 每秒刷新进程列表
    useEffect(() => {
        const refresh = async () => {
            const list = await processManager.getProcessList();
            setProcesses(list);
        };

        refresh();
        const interval = setInterval(refresh, 1000);
        return () => clearInterval(interval);
    }, []);

    // 手动刷新函数
    const refreshProcesses = useCallback(async () => {
        const list = await processManager.getProcessList();
        setProcesses(list);
    }, []);

    // 渲染进程项
    const renderItem = useCallback((proc: ProcessInfo, index: number, isSelected: boolean) => {
        const statusIcon = proc.status === 'running' ? '🟢' : '🔴';
        const duration = formatDuration(proc.duration);

        return (
            <Box flexDirection="column">
                <Box>
                    <Text color="cyan">
                        {statusIcon} [{proc.pid}]
                    </Text>
                    <Text> {truncate(proc.command, 40)}</Text>
                </Box>
                <Box paddingLeft={3}>
                    <Text dimColor>⏱ {duration}</Text>
                    <Text dimColor> | CPU: {proc.cpu.toFixed(1)}%</Text>
                    <Text dimColor> | MEM: {(proc.memory / 1024 / 1024).toFixed(1)}MB</Text>
                </Box>
            </Box>
        );
    }, []);

    // 删除（关闭）进程
    const handleKillProcess = useCallback((proc: ProcessInfo) => {
        processManager.killProcess(proc.pid);
    }, []);

    // 查看输出
    const handleSelect = useCallback((proc: ProcessInfo) => {
        setOutputPid(proc.pid);
    }, []);

    // 状态信息渲染函数
    const statusInfoFn = useCallback((items: ProcessInfo[]) => {
        return (
            <Text dimColor>
                运行中: {items.filter((p) => p.status === 'running').length} | 总计: {items.length} | Enter 查看输出 |
                Backspace/Delete 关闭进程
            </Text>
        );
    }, []);

    // 使用 useMemo 缓存配置
    const panelConfig: PanelConfig<ProcessInfo> = useMemo(
        () => ({
            id: 'processes',
            title: '进程管理器',
            icon: '⚙️',
            dataSource: () => Promise.resolve(processes),
            searchable: true,
            searchFields: ['command'],
            renderItem,
            keyExtractor: (proc) => proc.pid,
            onSelect: handleSelect,
            onDelete: handleKillProcess,
            itemHeight: 2,
            statusInfo: statusInfoFn,
            // 自定义快捷键：'r' 手动刷新进程列表
            keyMap: {
                r: () => {
                    refreshProcesses();
                },
            },
        }),
        [processes, renderItem, handleSelect, handleKillProcess, statusInfoFn, refreshProcesses],
    );

    return (
        <>
            {outputPid !== null ? (
                <ErrorBoundary name="ProcessOutputPanel" fallback={null}>
                    <ProcessOutputPanel pid={outputPid} onClose={() => setOutputPid(null)} />
                </ErrorBoundary>
            ) : (
                <UniversalPanel config={panelConfig} onClose={onClose} />
            )}
        </>
    );
};

// 辅助函数
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

export default ProcessPanel;
