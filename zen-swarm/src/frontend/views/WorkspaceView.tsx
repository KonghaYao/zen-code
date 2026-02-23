/**
 * WorkspaceView - 四栏布局的 Workspace 浏览器
 *
 * 布局结构：
 * - 第一栏（左）：Chat History - 聊天历史记录
 * - 第二栏：Chat - 聊天界面（输入+对话）
 * - 第三栏：Preview Panel - 文件预览区域（支持多个文件预览）
 * - 第四栏（右）：File Tree - 文件树面板
 *
 * 功能：
 * - Workspace 切换和管理
 * - 四栏独立调整宽度
 * - 集成聊天功能
 * - 文件树浏览
 * - 文件内容预览（支持标签页切换多个文件）
 * - **KeepAlive**: 每个 workspace 的状态保持（展开、搜索、选中、聊天状态）
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { KeepAlive, AliveScope } from 'react-activation';
import { ChatProvider, useChat } from '@langgraph-js/sdk/react';
import { apiClient } from '../api.js';
import { WorkspaceSelector, WorkspaceManageDialog, PanelLayout, PanelItem } from '../components/workspace/index.js';
import { FileTree } from '../components/fileExplorer/index.js';
import type { TreeNode } from '../components/fileExplorer/FileTree/FileTree.js';
import { PreviewPanel } from '../components/fileExplorer/Preview/index.js';
import { HistorySidebar } from '../components/HistorySidebar.js';
import { ChatInput, HumanMessage, AIMessage, ToolMessage } from '../components/index.js';
import { AgentSelect } from '../components/AgentSelect.js';
import { useCurrentWorkspace, useWorkspaces, useShowManageDialog, useWorkspaceStore } from '../stores/workspace.js';

// ========================================
// Types
// ========================================

interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
}

// ========================================
// Welcome Screen - 首次启动或无 Workspace
// ========================================

interface WelcomeScreenProps {
    onCreateWorkspace: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreateWorkspace }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-primary)]">
            <div className="text-center space-y-4">
                <div className="text-6xl mb-4">📁</div>
                <h1 className="text-2xl font-semibold">Welcome to Workspace</h1>
                <p className="text-[var(--color-text-secondary)] max-w-md">
                    Create a workspace to start exploring your projects. A workspace links to a folder on your computer.
                </p>
                <button
                    onClick={onCreateWorkspace}
                    className="mt-4 px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-colors"
                >
                    Create Workspace
                </button>
            </div>
        </div>
    );
};

// ========================================
// Chat Panel Component - 第二栏
// ========================================

const ChatPanelContent: React.FC<{ modelName?: string; onClose?: () => void }> = ({ modelName, onClose }) => {
    const chatStore = useChat();
    const {
        userInput,
        setUserInput,
        loading,
        renderMessages,
        sendMessage,
        stopGeneration,
        createNewChat,
        currentAgent,
    } = chatStore;

    const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
    const [isUserNearBottom, setIsUserNearBottom] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Initialize selected agent
    useEffect(() => {
        if (selectedAgentId) return;

        if (currentAgent) {
            setSelectedAgentId(currentAgent);
        }
    }, [currentAgent, selectedAgentId]);

    // 检测用户是否在底部
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setIsUserNearBottom(isNearBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // 只在用户在底部时自动滚动
    useEffect(() => {
        if (isUserNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [renderMessages, isUserNearBottom]);

    const handleSubmit = async (inputValue: string) => {
        if (!inputValue.trim()) return;

        await sendMessage([{ type: 'human', content: inputValue }], {
            extraParams: {
                agent_id: selectedAgentId,
            },
        });
        setUserInput('');
    };

    const handleStop = () => {
        stopGeneration();
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white border-r border-[var(--color-border-subtle)]">
            {/* Header */}
            <header className="flex-shrink-0 bg-white border-b border-[var(--color-border-subtle)] px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-medium text-[var(--color-text-primary)]">Chat</h1>
                </div>
                <div className="flex items-center gap-2">
                    <AgentSelect value={selectedAgentId} onChange={() => {}} disabled={loading} />
                    {loading ? (
                        <button
                            onClick={handleStop}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-[var(--color-border-default)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
                        >
                            Stop
                        </button>
                    ) : null}
                </div>
            </header>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 bg-[var(--color-bg-primary)]">
                {renderMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                                Start a conversation
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)]">Type your message below</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {renderMessages.map((message, index) => {
                            if (message.type === 'human') {
                                return (
                                    <HumanMessage
                                        key={message.id || `human-${index}`}
                                        message={message}
                                        messageNumber={index + 1}
                                    />
                                );
                            } else if (message.type === 'tool') {
                                return (
                                    <ToolMessage
                                        key={message.id || `tool-${index}`}
                                        message={message}
                                        messageNumber={index + 1}
                                    />
                                );
                            } else {
                                return (
                                    <AIMessage
                                        key={message.id || `ai-${index}`}
                                        message={message}
                                        messageNumber={index + 1}
                                        modelName={modelName}
                                    />
                                );
                            }
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <ChatInput
                value={userInput}
                onChange={setUserInput}
                onSubmit={handleSubmit}
                loading={loading}
                placeholder="Type your message..."
            />
        </div>
    );
};

// ========================================
// Workspace Content - 被 KeepAlive 缓存的内容区域
// ========================================

interface WorkspaceContentProps {
    workspaceId: string;
    rootPath: string;
}

const WorkspaceContent: React.FC<WorkspaceContentProps> = ({ workspaceId, rootPath }) => {
    console.log('WorkspaceContent rendered:', { workspaceId, rootPath });

    // ========================================
    // State - 文件树（每个 workspace 独立）
    // ========================================
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

    // ========================================
    // Effects - 加载文件树
    // ========================================
    useEffect(() => {
        const loadTree = async () => {
            setTreeLoading(true);
            try {
                const result = await apiClient.files.tree.query({
                    path: rootPath,
                    maxDepth: 3,
                });
                setTree(result.tree);
            } catch (err: any) {
                console.error('Failed to load file tree:', err);
                setTreeError(err.message || 'Failed to load file tree');
            } finally {
                setTreeLoading(false);
            }
        };

        loadTree();
    }, [rootPath, workspaceId]);

    // ========================================
    // Handlers - 文件树
    // ========================================
    const handleTreeSelect = useCallback((node: TreeNode) => {
        setSelectedNode(node);
    }, []);

    const handleTreeToggleExpand = useCallback((path: string) => {
        setExpandedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // ========================================
    // Render
    // ========================================
    return (
        <PanelLayout
            panels={[
                { id: 'history', position: 'left', defaultWidth: 240 },
                { id: 'chat', position: 'left', defaultWidth: 320 },
                { id: 'preview', position: 'center' },
                { id: 'tree', position: 'right', defaultWidth: 250 },
            ]}
            minPanelWidth={200}
            maxWidthPercent={35}
        >
            {/* 第一栏：Chat History */}
            <PanelItem
                id="history"
                position="left"
                className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-subtle)]"
            >
                <HistorySidebar />
            </PanelItem>

            {/* 第二栏：Chat */}
            <PanelItem id="chat" position="left">
                <ChatPanelContent modelName="AI" />
            </PanelItem>

            {/* 第三栏：文件预览 */}
            <PanelItem id="preview" position="center" className="bg-[var(--color-bg-primary)]">
                <PreviewPanel selectedNode={selectedNode} rootPath={rootPath} />
            </PanelItem>

            {/* 第四栏：文件树 */}
            <PanelItem
                id="tree"
                position="right"
                className="flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            >
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {treeError && (
                        <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <span>{treeError}</span>
                            </div>
                        </div>
                    )}
                    <FileTree
                        tree={tree}
                        selectedPath={selectedNode?.path ?? null}
                        expandedPaths={expandedPaths}
                        onSelect={handleTreeSelect}
                        onToggleExpand={handleTreeToggleExpand}
                        loading={treeLoading}
                    />
                </div>
            </PanelItem>
        </PanelLayout>
    );
};

// ========================================
// Main Component
// ========================================

export function WorkspaceView() {
    // ========================================
    // Workspace State
    // ========================================
    const currentWorkspace = useCurrentWorkspace();
    const workspaces = useWorkspaces();
    const showManageDialog = useShowManageDialog();
    const { openManageDialog, closeManageDialog, loadWorkspaces } = useWorkspaceStore();

    console.log('WorkspaceView rendered:', { currentWorkspace, workspaces });

    // ========================================
    // Effect - 初始化加载 Workspaces
    // ========================================
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // ========================================
    // 首次启动或无 Workspace
    // ========================================

    if (!currentWorkspace || workspaces.length === 0) {
        console.log('Showing welcome screen (no currentWorkspace or no workspaces)');
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* 顶部工具栏 */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <WorkspaceSelector onOpenManage={openManageDialog} />
                </div>

                {/* 欢迎屏幕 */}
                <WelcomeScreen onCreateWorkspace={openManageDialog} />

                {/* 管理对话框 */}
                <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
            </div>
        );
    }

    // ========================================
    // 主界面
    // ========================================

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <WorkspaceSelector onOpenManage={openManageDialog} />
            </div>

            {/* 使用 KeepAlive 缓存每个 workspace 的内容（包括所有子组件状态） */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <AliveScope>
                    <KeepAlive
                        cacheKey={currentWorkspace.id}
                        wrapperProps={{ className: 'h-full' }}
                        contentProps={{ className: 'h-full' }}
                    >
                        <ChatProvider
                            apiUrl="http://127.0.0.1:8124/api/langgraph"
                            defaultAgent="swarm"
                            defaultHeaders={{}}
                            withCredentials={false}
                            showHistory={false}
                            showGraph={false}
                            onInitError={(error, currentAgent) => {
                                console.error('Chat init error:', error, currentAgent);
                            }}
                            autoRestoreLastSession
                            historyFilter={{
                                path: currentWorkspace.rootPath,
                            }}
                        >
                            <WorkspaceContent
                                workspaceId={currentWorkspace.id}
                                rootPath={currentWorkspace.rootPath}
                                key={currentWorkspace.id}
                            />
                        </ChatProvider>
                    </KeepAlive>
                </AliveScope>
            </div>

            {/* 管理对话框 */}
            <WorkspaceManageDialog open={showManageDialog} onClose={closeManageDialog} />
        </div>
    );
}
