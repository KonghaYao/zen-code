/**
 * ChatSidebar 组件
 * 聊天页面的会话列表侧边栏
 * 使用 useChat hook 获取真实会话数据
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '@langgraph-js/sdk/react';
import { useInteractionContext } from '@codegraph/union-client';
import {
  Plus,
  MessageSquare,
  RefreshCw,
  Loader2,
  Circle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { cn } from '../../lib/utils';

export interface ChatSidebarProps {
  className?: string;
  currentSessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  className = '',
  currentSessionId,
  onSessionChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    historyList,
    currentChatId,
    refreshHistoryList,
    toHistoryChat,
    createNewChat,
  } = useChat();
  const { clearAll } = useInteractionContext();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 初始加载
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      await refreshHistoryList();
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤会话列表
  const filteredHistory = historyList.filter((thread: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const threadId = thread.thread_id || '';
      return threadId.toLowerCase().includes(query);
    }
    return true;
  });

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'idle':
        return { emoji: '🟢', color: 'fill-green-500', label: '空闲' };
      case 'busy':
        return { emoji: '🟡', color: 'fill-yellow-500', label: '忙碌' };
      case 'interrupted':
        return { emoji: '🟠', color: 'fill-orange-500', label: '中断' };
      case 'error':
        return { emoji: '🔴', color: 'fill-red-500', label: '错误' };
      default:
        return { emoji: '⚪', color: 'fill-gray-500', label: '未知' };
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // 切换到历史会话
  const handleSessionClick = async (thread: any) => {
    try {
      // MODIFIED: 切换会话前先清空所有交互
      console.log('[ChatSidebar] Switching session, clearing interactions');
      clearAll();

      await toHistoryChat(thread);
      // 更新 URL 参数
      const params = new URLSearchParams(location.search);
      params.set('session', thread.thread_id);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      onSessionChange?.(thread.thread_id);
    } catch (error) {
      console.error('切换会话失败:', error);
    }
  };

  // 创建新会话
  const handleCreateNew = async () => {
    try {
      // MODIFIED: 创建新会话前先清空所有交互
      console.log('[ChatSidebar] Creating new session, clearing interactions');
      clearAll();

      await createNewChat();
      navigate('/');
    } catch (error) {
      console.error('创建会话失败:', error);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`w-72 bg-gray-50 dark:bg-gray-900 border-r border-border flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">会话列表</h2>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadHistory}
                    disabled={loading}
                    className="h-8 w-8"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>刷新列表</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCreateNew}
                    className="h-8 w-8"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>新建对话</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="relative">
            <Input
              placeholder="搜索对话 ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Session List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? '没有找到匹配的会话' : loading ? '加载中...' : '还没有会话'}
                </p>
                {!searchQuery && !loading && (
                  <p className="text-xs mt-1">点击上方 + 创建新对话</p>
                )}
              </div>
            ) : (
              filteredHistory.map((thread: any) => {
                const statusInfo = getStatusInfo(thread.status);
                const isActive = thread.thread_id === currentChatId;

                return (
                  <Tooltip key={thread.thread_id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleSessionClick(thread)}
                        className={`
                          group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                          ${isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate font-mono">
                              {thread.thread_id?.substring(0, 8)}...
                            </p>
                            {statusInfo.emoji && (
                              <span className="text-xs">{statusInfo.emoji}</span>
                            )}
                          </div>
                          <p
                            className={`text-xs ${
                              isActive
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {formatTime(thread.updated_at)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Circle className={cn('w-2 h-2', statusInfo.color)} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="space-y-1">
                        <p className="font-mono text-xs">{thread.thread_id}</p>
                        <p className="text-xs">状态: {statusInfo.label}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {filteredHistory.length} 个会话
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
