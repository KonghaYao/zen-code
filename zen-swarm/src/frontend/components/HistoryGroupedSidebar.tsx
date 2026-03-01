/**
 * HistoryGroupedSidebar - 按 workspace 分组的聊天历史侧边栏
 *
 * 功能：
 * - 按 metadata.path 分组显示历史记录
 * - 每个分组可折叠/展开
 * - 默认展开当前 workspace 的分组
 * - 支持在指定 workspace 下创建新会话
 * - 底部有 [+ Add Workspace] 按钮
 */

import { useState, useMemo, useEffect } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import type { Thread } from '@langgraph-js/sdk';
import { formatDate } from '../utils/chatHelpers.js';
import { useWorkspaceStore } from '../stores/workspace.js';
import { PlusIcon, SettingsIcon, Trash2Icon } from 'lucide-react';

// 定义历史记录线程类型，包含可选的 title 字段
type HistoryThread = Thread<{ messages: any[] }> & {
    title?: string;
};

// ========================================
// Types
// ========================================

interface HistoryGroup {
    workspaceName: string; // 从 path 提取的名称
    rootPath: string; // 完整路径
    threads: HistoryThread[]; // 该 workspace 的历史记录
    count: number; // 记录数量
    isExpanded: boolean; // 是否展开
}

interface HistoryGroupedSidebarProps {
    onSwitchToChat?: () => void;
    onManageWorkspace?: (rootPath: string) => void;
    onAddWorkspace?: () => void;
}

// ========================================
// Helper Functions
// ========================================

// 从路径提取 workspace 名称
function getWorkspaceName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
}

// ========================================
// Components
// ========================================

// 分组折叠/展开图标
const ExpandIcon: React.FC<{ isExpanded: boolean; onClick: () => void }> = ({ isExpanded, onClick }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="text-text-muted hover:text-text-primary transition-colors"
    >
        <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    </button>
);

// 记录数量徽章
const CountBadge: React.FC<{ count: number }> = ({ count }) => (
    <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary text-text-secondary rounded-full font-medium">
        {count}
    </span>
);

// 新建会话按钮（在分组标题中）
const NewChatButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="ml-1 w-5 h-5 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
        title="New chat in this workspace"
    >
        <PlusIcon size={12} />
    </button>
);

// 管理 workspace 按钮（在分组标题中）
const ManageWorkspaceButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        className="ml-1 w-5 h-5 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
        title="Manage workspace"
    >
        <SettingsIcon size={12} />
    </button>
);

// 历史记录条目
const HistoryItem: React.FC<{
    thread: HistoryThread;
    isCurrent: boolean;
    onClick: () => void;
    onDelete: () => void;
}> = ({ thread, isCurrent, onClick, onDelete }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className={`
                relative w-full flex items-center rounded transition-colors duration-150
                ${isCurrent ? 'bg-primary-light text-primary-dark' : 'hover:bg-bg-tertiary text-text-secondary'}
            `}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <button onClick={onClick} className="flex-1 min-w-0 text-left px-2 py-1.5 text-xs">
                <div className="flex items-center gap-1 min-w-0">
                    <span className="truncate flex-1">{(thread as any).title || thread.thread_id.slice(0, 12)}</span>
                    <span className="text-[10px] text-text-muted flex-shrink-0">{formatDate(thread.updated_at)}</span>
                </div>
            </button>
            {hovered && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors mr-1"
                    title="Delete chat"
                >
                    <Trash2Icon size={12} />
                </button>
            )}
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export function HistoryGroupedSidebar({ onManageWorkspace, onAddWorkspace }: HistoryGroupedSidebarProps) {
    const { historyList = [], currentChatId, toHistoryChat, createNewChat, deleteHistoryChat } = useChat();
    const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        // 默认展开当前 workspace 的分组
        const initial = new Set<string>();
        if (currentWorkspace) {
            initial.add(currentWorkspace.rootPath);
        }
        return initial;
    });

    // currentWorkspace 异步加载完成后，自动展开其分组
    useEffect(() => {
        if (currentWorkspace) {
            setExpandedGroups((prev) => {
                if (prev.has(currentWorkspace.rootPath)) return prev;
                const next = new Set(prev);
                next.add(currentWorkspace.rootPath);
                return next;
            });
        }
    }, [currentWorkspace?.rootPath]);

    // ========================================
    // 分组逻辑
    // ========================================
    const historyGroups = useMemo(() => {
        const groups = new Map<string, HistoryGroup>();

        // 遍历所有历史记录并分组
        historyList.forEach((thread) => {
            const path = (thread.metadata?.path as string) || 'default';
            const workspaceName = getWorkspaceName(path);

            if (!groups.has(path)) {
                groups.set(path, {
                    workspaceName,
                    rootPath: path,
                    threads: [],
                    count: 0,
                    isExpanded: expandedGroups.has(path),
                });
            }

            const group = groups.get(path)!;
            group.threads.push(thread as HistoryThread);
            group.count++;
        });

        return Array.from(groups.values());
    }, [historyList, expandedGroups]);

    // ========================================
    // Handlers
    // ========================================
    const toggleGroup = (path: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleSelectThread = async (thread: HistoryThread) => {
        // 切换到历史记录所在的 workspace（如果需要）
        const threadPath = thread.metadata?.path as string;
        if (threadPath) {
            const workspace = workspaces.find((w) => w.rootPath === threadPath);
            if (workspace && workspace.id !== currentWorkspace?.id) {
                // 先切换 workspace，这会触发 ChatProvider 重新渲染并更新 historyFilter
                await setCurrentWorkspace(workspace.id);

                // 等待一小段时间，确保 ChatProvider 完成重新渲染
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        // 现在切换到历史记录
        await toHistoryChat(thread);
    };

    const handleNewChatInWorkspace = async (rootPath: string) => {
        // 切换到目标 workspace
        const workspace = workspaces.find((w) => w.rootPath === rootPath);
        if (workspace) {
            createNewChat({
                path: rootPath,
            });
        }
    };

    const handleManageWorkspace = (rootPath: string) => {
        // 调用父组件传递的回调
        if (onManageWorkspace) {
            onManageWorkspace(rootPath);
        }
    };

    const handleAddWorkspace = () => {
        // 调用父组件传递的回调
        if (onAddWorkspace) {
            onAddWorkspace();
        }
    };

    return (
        <div
            className="flex-shrink-0 bg-bg-secondary text-text-primary flex flex-col h-full overflow-hidden"
            style={{ width: '240px' }}
        >
            {/* 顶部：Add Workspace Button */}
            <div className="p-3">
                <button
                    onClick={handleAddWorkspace}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover rounded text-xs font-medium text-white transition-colors duration-150"
                >
                    <span className="text-sm">+</span>
                    <span>Add Workspace</span>
                </button>
            </div>

            {/* 中间：分组列表 */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {historyGroups.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-muted">No conversations yet</div>
                ) : (
                    historyGroups.map((group) => {
                        const isCurrentWorkspace = currentWorkspace?.rootPath === group.rootPath;

                        return (
                            <div
                                key={group.rootPath}
                                className={`rounded ${isCurrentWorkspace ? 'bg-bg-tertiary' : ''}`}
                            >
                                {/* 分组标题 */}
                                <div
                                    className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-bg-tertiary rounded"
                                    onClick={() => toggleGroup(group.rootPath)}
                                >
                                    <ExpandIcon
                                        isExpanded={group.isExpanded}
                                        onClick={() => toggleGroup(group.rootPath)}
                                    />
                                    <span className="flex-1 text-xs font-medium truncate">{group.workspaceName}</span>
                                    <CountBadge count={group.count} />
                                    {group.isExpanded && (
                                        <>
                                            <NewChatButton onClick={() => handleNewChatInWorkspace(group.rootPath)} />
                                            <ManageWorkspaceButton
                                                onClick={() => handleManageWorkspace(group.rootPath)}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* 分组内容（历史记录） */}
                                {group.isExpanded && (
                                    <div className="pl-3 pr-1 py-1 space-y-0.5">
                                        {group.threads.map((thread) => {
                                            const isCurrent = thread.thread_id === currentChatId;
                                            return (
                                                <HistoryItem
                                                    key={thread.thread_id}
                                                    thread={thread}
                                                    isCurrent={isCurrent}
                                                    onClick={() => handleSelectThread(thread)}
                                                    onDelete={() => deleteHistoryChat(thread)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
