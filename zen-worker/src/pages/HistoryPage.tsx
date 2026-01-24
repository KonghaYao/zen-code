/**
 * HistoryPage - 历史记录页面
 * 仿照 zen-code 的 HistoryPanel 设计
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@langgraph-js/sdk/react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  MessageSquare,
  RefreshCw,
  Plus,
  Search,
  Circle,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterType {
  id: string;
  label: string;
  color: string;
}

const FILTERS: FilterType[] = [
  { id: 'all', label: '全部', color: 'bg-gray-500' },
  { id: 'idle', label: '空闲', color: 'bg-green-500' },
  { id: 'busy', label: '忙碌', color: 'bg-yellow-500' },
  { id: 'error', label: '错误', color: 'bg-red-500' },
];

export function HistoryPage() {
  const navigate = useNavigate();
  const {
    historyList,
    currentChatId,
    refreshHistoryList,
    toHistoryChat,
    createNewChat,
  } = useChat();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

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

  // 过滤历史记录
  const filteredHistory = historyList.filter((thread: any) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const threadId = thread.thread_id || '';
      if (!threadId.toLowerCase().includes(query)) {
        return false;
      }
    }

    // 状态过滤
    if (activeFilter !== 'all') {
      if (thread.status !== activeFilter) {
        return false;
      }
    }

    return true;
  });

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'idle':
        return { emoji: '🟢', color: 'text-green-500', label: '空闲' };
      case 'busy':
        return { emoji: '🟡', color: 'text-yellow-500', label: '忙碌' };
      case 'interrupted':
        return { emoji: '🟠', color: 'text-orange-500', label: '中断' };
      case 'error':
        return { emoji: '🔴', color: 'text-red-500', label: '错误' };
      default:
        return { emoji: '⚪', color: 'text-gray-500', label: status || '未知' };
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
      return '昨天 ' + date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // 切换到历史会话
  const handleSelectThread = async (thread: any) => {
    try {
      await toHistoryChat(thread);
      navigate('/');
    } catch (error) {
      console.error('切换会话失败:', error);
    }
  };

  // 创建新会话
  const handleCreateNew = async () => {
    try {
      await createNewChat();
      navigate('/');
    } catch (error) {
      console.error('创建会话失败:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">历史记录</h2>
              <p className="text-sm text-muted-foreground mt-1">
                共 {filteredHistory.length} 条对话记录
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                刷新
              </Button>
              <Button size="sm" onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                新建对话
              </Button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索对话 ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 过滤器 */}
          <div className="flex items-center gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.id)}
                className="relative"
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full mr-2',
                    filter.color,
                    activeFilter === filter.id && filter.color
                  )}
                />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || activeFilter !== 'all'
                    ? '没有找到匹配的对话'
                    : '还没有历史记录'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || activeFilter !== 'all'
                    ? '尝试调整搜索关键词或过滤器'
                    : '开始一个新的对话吧'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((thread: any, index: number) => {
                const statusInfo = getStatusInfo(thread.status);
                const isCurrent = thread.thread_id === currentChatId;

                return (
                  <Card
                    key={thread.thread_id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      isCurrent && 'border-primary border-2'
                    )}
                    onClick={() => handleSelectThread(thread)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* 序号 */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>

                        {/* 主要信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">
                              {thread.thread_id?.substring(0, 8)}...
                            </span>
                            {isCurrent && (
                              <Badge variant="default" className="text-xs">
                                当前
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {statusInfo.emoji}
                              {statusInfo.label}
                            </span>
                            <span>•</span>
                            <span>{formatTime(thread.updated_at)}</span>
                          </div>
                        </div>

                        {/* 状态指示器 */}
                        <div className="flex-shrink-0">
                          <Circle
                            className={cn(
                              'w-3 h-3',
                              statusInfo.color.replace('text-', 'fill-')
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
