/**
 * GlobalApprovalPanel - 全局审批面板组件 (Web 版本)
 *
 * 显示和管理审批请求，支持：
 * - 多 Tab 显示审批请求
 * - Tab 切换
 * - 批量执行已审批的请求
 * - 统计信息显示
 */

import React, { useMemo, useCallback, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { ApprovalItem } from './ApprovalItem';
import type { ApprovalRequest } from './types';
import { ApprovalStatus } from './types';
import { useApproval } from '../../contexts/ApprovalContext';

interface GlobalApprovalPanelProps {
    /** 允许的审批决策 */
    allowedDecisions?: string[];
    /** 是否自动显示面板（有 pending 请求时） */
    autoShow?: boolean;
    /** 是否显示标题和边框 */
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
 */
export const GlobalApprovalPanel = forwardRef<GlobalApprovalPanelRef, GlobalApprovalPanelProps>(
    (
        {
            allowedDecisions = ['approve', 'edit', 'reject'],
            autoShow = true,
            showHeader = true,
            compact = false,
        }: GlobalApprovalPanelProps,
        ref
    ) => {
        // 使用 ApprovalContext 获取共享状态
        const {
            requests,
            updateApprovalRequest,
            executeApproved,
        } = useApproval();

        // 本地状态：当前激活的 tab
        const [activeTab, setActiveTab] = useState<string | null>(null);

        // 暴露方法给父组件
        useImperativeHandle(
            ref,
            () => ({
                getRequests: () => requests,
            }),
            [requests]
        );

        // 显示所有暂存的请求（所有状态）
        const pendingRequests = useMemo(() => requests, [requests]);

        // 初始化和自动切换 activeTab
        useEffect(() => {
            if (pendingRequests.length > 0 && !activeTab) {
                // 第一次初始化
                setActiveTab(pendingRequests[0].id);
            } else if (activeTab && !pendingRequests.find(r => r.id === activeTab)) {
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
        const handleTabChange = useCallback((tabId: string) => {
            setActiveTab(tabId);
        }, []);

        // 跳转到下一个 Pending 请求
        const nextTab = useCallback(
            (currentRequestId: string) => {
                const currentIndex = requests.findIndex(r => r.id === currentRequestId);
                const nextPending = requests.slice(currentIndex + 1).find(r => r.status === ApprovalStatus.Pending);

                if (nextPending) {
                    setActiveTab(nextPending.id);
                } else {
                    // 如果后面没有 Pending 的，从前面找
                    const firstPending = requests.find(r => r.status === ApprovalStatus.Pending);
                    if (firstPending) {
                        setActiveTab(firstPending.id);
                    }
                }
            },
            [requests]
        );

        // 审批操作处理 - 只暂存状态，不立即执行
        const handleApprove = useCallback(
            (requestId: string) => {
                updateApprovalRequest(requestId, { status: ApprovalStatus.Approved });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab]
        );

        const handleEdit = useCallback(
            (requestId: string, editedArgs: any) => {
                updateApprovalRequest(requestId, {
                    status: ApprovalStatus.Edited,
                    editedArgs,
                });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab]
        );

        const handleReject = useCallback(
            (requestId: string, message: string) => {
                // 暂存拒绝状态，不立即移除
                updateApprovalRequest(requestId, { status: ApprovalStatus.Rejected });
                nextTab(requestId);
            },
            [updateApprovalRequest, nextTab]
        );

        // 当前选中的请求
        const selectedRequest = useMemo(() => {
            return requests.find(r => r.id === activeTab) || null;
        }, [requests, activeTab]);

        if (requests.length === 0) {
            return null;
        }

        return (
            <div className={`${compact ? 'p-2' : 'p-4'} bg-white border border-gray-200 rounded-lg shadow-sm`}>
                {/* 统计信息 */}
                {showHeader && (
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b">
                        <span className="text-sm text-gray-500">|</span>
                        <span className="text-sm text-green-600 font-medium">✅ {stats.approved}</span>
                        <span className="text-sm text-yellow-600 font-medium">📝 {stats.edited}</span>
                        <span className="text-sm text-red-600 font-medium">❌ {stats.rejected}</span>
                        <span className="text-sm text-gray-500">|</span>
                        <span className="text-sm text-blue-600 font-medium">⏳ {stats.pending} pending</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="mb-3">
                    <div className="flex gap-2 overflow-x-auto">
                        {requests.map((request) => {
                            const isSelected = request.id === activeTab;
                            const statusIcon = {
                                [ApprovalStatus.Pending]: '⏳',
                                [ApprovalStatus.Approved]: '✅',
                                [ApprovalStatus.Edited]: '📝',
                                [ApprovalStatus.Rejected]: '❌',
                            }[request.status];

                            return (
                                <button
                                    key={request.id}
                                    onClick={() => handleTabChange(request.id)}
                                    className={`px-3 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                                        isSelected
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {statusIcon} {request.toolCall.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 当前选中项的内容 */}
                {selectedRequest && (
                    <div className="mt-3">
                        <ApprovalItem
                            key={`${selectedRequest.id}-${activeTab}`}
                            request={selectedRequest}
                            allowedDecisions={allowedDecisions}
                            onApprove={() => handleApprove(selectedRequest.id)}
                            onEdit={(args) => handleEdit(selectedRequest.id, args)}
                            onReject={(msg) => handleReject(selectedRequest.id, msg)}
                        />
                    </div>
                )}

                {/* 批量执行按钮提示 */}
                {showHeader && (stats.approved > 0 || stats.edited > 0 || stats.rejected > 0) && (
                    <div className="mt-4 pt-3 border-t text-sm text-gray-500 flex justify-between items-center">
                        <span>
                            <span className="font-medium text-green-600">批准完成后将自动执行</span>
                        </span>
                        <button
                            onClick={executeApproved}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                            立即执行已批准的请求
                        </button>
                    </div>
                )}
            </div>
        );
    }
);

GlobalApprovalPanel.displayName = 'GlobalApprovalPanel';
