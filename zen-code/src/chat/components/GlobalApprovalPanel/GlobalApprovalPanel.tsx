import { useMemo, useCallback, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Tabs, TabItem } from '../input/Tabs';
import { ApprovalItem } from './ApprovalItem';
import { useApproval } from '@codegraph/union-client';
import { ApprovalRequest, ApprovalStatus } from '@codegraph/union-client';
import { useInput } from 'ink-pro';

interface GlobalApprovalPanelProps {
    /** 允许的审批决策 */
    allowedDecisions?: string[];
    /** 是否自动显示面板（有 pending 请求时） */
    autoShow?: boolean;
    /** 是否显示标题和边框（内嵌模式时可关闭） */
    showHeader?: boolean;
    /** 是否紧凑模式（减少间距） */
    compact?: boolean;
}

/**
 * 全局审批面板实例接口（通过 ref 暴露）
 */
export interface GlobalApprovalPanelRef {
    /** 获取所有审批请求 */
    getRequests: () => ApprovalRequest[];
}

/**
 * 全局审批面板组件
 *
 * 显示和管理审批请求，支持：
 * - 多 Tab 显示审批请求
 * - Tab 切换
 * - 批量执行已审批的请求
 * - 统计信息显示
 */
export const GlobalApprovalPanel = forwardRef<GlobalApprovalPanelRef, GlobalApprovalPanelProps>(
    (
        {
            allowedDecisions = ['approve', 'edit', 'reject'],
            autoShow = true,
            showHeader = true,
            compact = false,
        }: GlobalApprovalPanelProps,
        ref,
    ) => {
        // 使用 ApprovalContext 获取共享状态
        const { requests, updateApprovalRequest, executeApproved } = useApproval();

        // 本地状态：当前激活的 tab
        const [activeTab, setActiveTab] = useState<string | null>(null);

        // 暴露方法给父组件
        useImperativeHandle(
            ref,
            () => ({
                getRequests: () => requests,
            }),
            [requests],
        );

        // 显示所有暂存的请求（所有状态）
        const pendingRequests = useMemo(() => requests, [requests]);

        // 初始化和自动切换 activeTab
        useEffect(() => {
            if (pendingRequests.length > 0 && !activeTab) {
                // 第一次初始化
                setActiveTab(pendingRequests[0].id);
            } else if (activeTab && !pendingRequests.find((r) => r.id === activeTab)) {
                // 如果当前激活的 tab 不在 pending 列表中，切换到第一个
                setActiveTab(pendingRequests.length > 0 ? pendingRequests[0].id : null);
            }
        }, [pendingRequests, activeTab]);

        // 统计信息
        const stats = useMemo(() => {
            const approved = requests.filter((r) => r.status === ApprovalStatus.Approved).length;
            const edited = requests.filter((r) => r.status === ApprovalStatus.Edited).length;
            const rejected = requests.filter((r) => r.status === ApprovalStatus.Rejected).length;
            const pending = requests.filter((r) => r.status === ApprovalStatus.Pending).length;

            return { approved, edited, rejected, pending };
        }, [requests]);

        // Tab 切换处理
        const handleTabChange = useCallback((index: number, item: TabItem) => {
            setActiveTab(item.id);
        }, []);

        // 跳转到下一个 Pending 请求
        const nextTab = useCallback(
            (currentRequestId: string) => {
                const currentIndex = requests.findIndex((r) => r.id === currentRequestId);
                const nextPending = requests.slice(currentIndex + 1).find((r) => r.status === ApprovalStatus.Pending);

                if (nextPending) {
                    setActiveTab(nextPending.id);
                } else {
                    // 如果后面没有 Pending 的，从前面找
                    const firstPending = requests.find((r) => r.status === ApprovalStatus.Pending);
                    if (firstPending) {
                        setActiveTab(firstPending.id);
                    }
                }
            },
            [requests],
        );

        // 审批操作处理 - 只暂存状态，不立即执行
        const handleApprove = useCallback(
            (requestId: string) => {
                updateApprovalRequest(requestId, { status: ApprovalStatus.Approved });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab],
        );

        const handleEdit = useCallback(
            (requestId: string, editedArgs: any) => {
                updateApprovalRequest(requestId, {
                    status: ApprovalStatus.Edited,
                    editedArgs,
                });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab],
        );

        const handleReject = useCallback(
            (requestId: string, message: string) => {
                // 暂存拒绝状态，不立即移除
                updateApprovalRequest(requestId, { status: ApprovalStatus.Rejected });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab],
        );

        useInput(
            (input, key) => {
                if (key.alt && input === 'e') {
                    console.log('[GlobalApprovalPanel] Alt+E pressed, executing approved requests');
                    executeApproved();
                }
            },
            { isActive: true },
        );

        // 生成 Tab items
        const tabItems: TabItem[] = pendingRequests.map((request, index) => {
            const isSelected = request.id === activeTab;
            const statusIcon = {
                [ApprovalStatus.Pending]: '⏳',
                [ApprovalStatus.Approved]: '✅',
                [ApprovalStatus.Edited]: '📝',
                [ApprovalStatus.Rejected]: '❌',
            }[request.status];

            return {
                id: request.id,
                label: `${statusIcon} ${request.toolCall.name}`,
                content: (
                    <ApprovalItem
                        key={`${request.id}-${activeTab}`}
                        request={request}
                        allowedDecisions={allowedDecisions}
                        onApprove={() => handleApprove(request.id)}
                        onEdit={(args) => handleEdit(request.id, args)}
                        onReject={(msg) => handleReject(request.id, msg)}
                        autoFocus={isSelected}
                    />
                ),
            };
        });

        return (
            <Box flexDirection="column" paddingY={compact ? 0 : 1}>
                {/* 统计信息 */}
                {showHeader && (
                    <Box paddingX={1}>
                        <Text color="gray"> | </Text>
                        <Text color="green">✅ {stats.approved}</Text>
                        <Text color="gray"> </Text>
                        <Text color="yellow">📝 {stats.edited}</Text>
                        <Text color="gray"> </Text>
                        <Text color="red">❌ {stats.rejected}</Text>
                        <Text color="gray"> | </Text>
                        <Text color="blue">⏳ {stats.pending} pending</Text>
                    </Box>
                )}

                {/* Tabs */}
                <Box paddingX={1} marginTop={compact ? 0 : 1}>
                    <Tabs
                        key={activeTab}
                        items={tabItems}
                        defaultIndex={tabItems.findIndex((item) => item.id === activeTab)}
                        onChange={handleTabChange}
                        autoFocus={false}
                        variant="line"
                    />
                </Box>

                {/* 批量执行按钮提示 */}
                {showHeader && (
                    <Box paddingX={1} marginTop={compact ? 0 : 1}>
                        <Text dimColor color="gray">
                            <Text color="green" bold>
                                Alt+E
                            </Text>{' '}
                            Approve All |
                            <Text color="yellow" bold>
                                {' '}
                                ←→
                            </Text>{' '}
                            Switch
                        </Text>
                    </Box>
                )}
            </Box>
        );
    },
);
