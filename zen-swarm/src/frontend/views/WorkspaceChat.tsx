/**
 * WorkspaceChat - Workspace 的 Chat 提供者包装组件
 *
 * 功能：
 * - 提供 ChatProvider 上下文
 * - 包含 WorkspaceContent 内容区域
 * - 支持每个 workspace 独立的聊天会话
 */

import React from 'react';
import { ChatProvider } from '@langgraph-js/sdk/react';
import { WorkspaceContent } from './WorkspaceContent.js';

interface WorkspaceChatProps {
    workspaceId: string;
    rootPath: string;
}

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({ workspaceId, rootPath }) => {
    console.log('WorkspaceChat rendered:', rootPath);

    return (
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
                metadata: { path: rootPath },
                status: null,
                sortBy: 'updated_at',
                sortOrder: 'desc',
            }}
        >
            <WorkspaceContent workspaceId={workspaceId} rootPath={rootPath} />
        </ChatProvider>
    );
};
