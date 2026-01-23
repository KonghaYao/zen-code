import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback, useEffect } from 'react';
import { ApprovalRequest, ApprovalStatus } from './types';

/**
 * 审批上下文接口
 */
interface ApprovalContextValue {
    /** 所有审批请求 */
    requests: ApprovalRequest[];
    /** 添加审批请求到队列 */
    addApprovalRequest: (request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) => string;
    /** 更新审批请求状态 */
    updateApprovalRequest: (id: string, updates: Partial<ApprovalRequest>) => void;
    /** 移除审批请求 */
    removeApprovalRequest: (id: string) => void;
    /** 清空所有已完成的请求 */
    clearCompletedApprovals: () => void;
    /** 执行单个审批请求 */
    executeRequest: (request: ApprovalRequest) => Promise<void>;
    /** 是否有待处理的审批请求 */
    hasPendingRequests: boolean;
    /** 所有请求是否都已处理完毕（有请求且没有 pending） */
    allRequestsProcessed: boolean;
    /** 批量执行所有已审批的请求 */
    executeApproved: () => Promise<void>;
}

/**
 * 审批上下文
 */
const ApprovalContext = createContext<ApprovalContextValue | null>(null);

/**
 * 使用审批上下文的 Hook
 */
export const useApproval = (): ApprovalContextValue => {
    const context = useContext(ApprovalContext);
    if (!context) {
        throw new Error('useApproval must be used within ApprovalProvider');
    }
    return context;
};

interface ApprovalProviderProps {
    children: ReactNode;
}

/**
 * 审批上下文提供者
 *
 * 提供全局审批队列管理功能
 */
export const ApprovalProvider: React.FC<ApprovalProviderProps> = ({
    children,
}) => {
    // 内部状态管理
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    /**
         * 执行审批请求的回调
         *
         * 这个函数会收到一个 ApprovalRequest，需要调用对应 tool 的 sendResumeData
         * tool 对象在 terminal.tsx 中添加请求时存储在 request 中
         */
    const onExecuteRequest = useCallback(async (request: ApprovalRequest & { tool?: any }) => {

        // 从 request 中获取 tool 对象（需要在添加请求时存储）
        const tool = request.tool;
        if (!tool) {
            return;
        }

        // 根据审批状态调用 sendResumeData
        const { status, editedArgs } = request;

        if (status === ApprovalStatus.Approved) {
            tool.sendResumeData({ type: 'approve' });
        } else if (status === ApprovalStatus.Edited) {
            const editedAction = {
                name: tool.message.name!,
                args: editedArgs,
            };
            tool.sendResumeData({
                type: 'edit',
                edited_action: editedAction,
            });
        } else if (status === ApprovalStatus.Rejected) {
            const message = 'User rejected to run this tool';
            tool.sendResumeData({
                type: 'reject',
                message,
            });
        } else {
            console.error('[ChatWrapper] Unknown approval status:', status);
        }
    }, []);
    /**
     * 生成唯一 ID
     */
    const generateId = useCallback(() => {
        return `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }, []);

    /**
     * 添加审批请求到队列
     */
    const addApprovalRequest = useCallback((request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) => {
        const newRequest: ApprovalRequest = {
            ...request,
            id: generateId(),
            status: ApprovalStatus.Pending,
            createdAt: new Date(),
        };

        setRequests(prev => {
            const updated = [...prev, newRequest];
            // 如果是第一个请求，自动激活
            if (prev.length === 0) {
                setActiveTab(newRequest.id);
            }
            return updated;
        });

        return newRequest.id;
    }, [generateId]);

    /**
     * 更新审批请求状态
     */
    const updateApprovalRequest = useCallback((id: string, updates: Partial<ApprovalRequest>) => {
        setRequests(prev => prev.map(req =>
            req.id === id ? { ...req, ...updates } : req
        ));
    }, []);

    /**
     * 移除审批请求
     */
    const removeApprovalRequest = useCallback((id: string) => {
        setRequests(prev => {
            const filtered = prev.filter(req => req.id !== id);
            // 如果移除的是当前激活的 tab，切换到第一个
            if (activeTab === id) {
                setActiveTab(filtered.length > 0 ? filtered[0].id : null);
            }
            return filtered;
        });
    }, [activeTab]);

    /**
     * 清空所有已处理的请求（Approved/Edited/Rejected）
     * 只保留 Pending 状态的请求
     */
    const clearCompletedApprovals = useCallback(() => {
        setRequests(prev => {
            const pending = prev.filter(req => req.status === ApprovalStatus.Pending);
            // 如果清空后没有请求了，清空 activeTab
            if (pending.length === 0) {
                setActiveTab(null);
            } else if (activeTab && !pending.find(req => req.id === activeTab)) {
                // 如果当前激活的 tab 被清空了，切换到第一个
                setActiveTab(pending[0].id);
            }
            return pending;
        });
    }, [activeTab]);

    /**
     * 批量执行所有已处理的请求（Approved/Edited/Rejected）
     */
    const executeApproved = useCallback(async () => {
        const processedRequests = requests.filter(req =>
            req.status === ApprovalStatus.Approved ||
            req.status === ApprovalStatus.Edited ||
            req.status === ApprovalStatus.Rejected
        );
        if (processedRequests.length === 0) {
            return;
        }

        // 依次执行已处理的请求
        for (const request of processedRequests) {
            try {
                await onExecuteRequest(request);
            } catch (error) {
                console.error(`[ApprovalContext] Execute approval request failed: ${request.id}`, error);
            }
        }
        clearCompletedApprovals();
    }, [requests, onExecuteRequest, clearCompletedApprovals]);

    /**
     * 执行单个审批请求
     */
    const executeRequest = useCallback(async (request: ApprovalRequest) => {
        await onExecuteRequest(request);
    }, [onExecuteRequest]);

    // 计算是否有待处理的审批请求
    const hasPendingRequests = useMemo(
        () => requests.some((req) => req.status === ApprovalStatus.Pending),
        [requests]
    );

    // 计算所有请求是否都已处理完毕（有请求且没有 pending）
    const allRequestsProcessed = useMemo(
        () => requests.length > 0 && !hasPendingRequests,
        [requests.length, hasPendingRequests]
    );

    // 当所有请求都处理完毕时，自动执行
    useEffect(() => {
        if (allRequestsProcessed) {
            executeApproved();
        }
    }, [allRequestsProcessed, executeApproved]);



    // 构建上下文值，使用 useMemo 优化性能
    const contextValue = useMemo<ApprovalContextValue>(
        () => ({
            requests,
            addApprovalRequest,
            updateApprovalRequest,
            removeApprovalRequest,
            clearCompletedApprovals,
            executeRequest,
            executeApproved,
            hasPendingRequests,
            allRequestsProcessed,

        }),
        [requests, addApprovalRequest, updateApprovalRequest, removeApprovalRequest, clearCompletedApprovals, executeRequest, executeApproved, hasPendingRequests, allRequestsProcessed]
    );

    return <ApprovalContext.Provider value={contextValue}>{children}</ApprovalContext.Provider>;
};
