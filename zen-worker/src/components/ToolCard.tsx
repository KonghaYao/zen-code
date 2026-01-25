/**
 * ToolCard - 统一的工具渲染卡片组件
 * 使用 shadcn/ui 组件系统
 */

import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { cn } from 'src/lib/utils';

export interface ToolCardProps {
  /** 工具图标 */
  icon: string;
  /** 工具名称/标题 */
  title: string;
  /** 工具类型/操作描述 */
  operation?: string;
  /** 额外信息（如行数、命令数等） */
  meta?: string | number;
  /** 输出内容 */
  output?: any;
  /** 状态 */
  status?: 'loading' | 'success' | 'error' | 'pending';
  /** 颜色主题 */
  variant?: 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'gray' | 'indigo' | 'red';
  /** 自定义类名 */
  className?: string;
  /** 是否使用滚动区域 */
  scrollable?: boolean;
  /** 最大高度 */
  maxHeight?: string;
}

const variantStyles = {
  blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  green: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
  yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
  orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
  purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800',
  gray: 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800',
  indigo: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800',
  red: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
};

const textVariantStyles = {
  blue: 'text-blue-700 dark:text-blue-300',
  green: 'text-green-700 dark:text-green-300',
  yellow: 'text-yellow-700 dark:text-yellow-300',
  orange: 'text-orange-700 dark:text-orange-300',
  purple: 'text-purple-700 dark:text-purple-300',
  gray: 'text-gray-700 dark:text-gray-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
  red: 'text-red-700 dark:text-red-300',
};

const badgeVariantStyles = {
  blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
  gray: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
  red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
};

export const ToolCard: React.FC<ToolCardProps> = ({
  icon,
  title,
  operation,
  meta,
  output,
  status = 'success',
  variant = 'blue',
  className,
  scrollable = false,
  maxHeight = '16rem',
}) => {
  const Content = scrollable ? ScrollArea : React.Fragment;
  const contentProps = scrollable ? { className: 'max-h-64' } : {};

  return (
    <Card className={cn(variantStyles[variant], 'border-l-4', className)}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-2xl">{icon}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-medium', textVariantStyles[variant])}>
              {title}
            </span>
            {operation && (
              <Badge variant="outline" className={cn('text-xs', badgeVariantStyles[variant])}>
                {operation}
              </Badge>
            )}
            {meta && (
              <Badge variant="secondary" className="text-xs">
                {typeof meta === 'number' ? `${meta} items` : meta}
              </Badge>
            )}
          </div>
        </div>

        {/* Status indicator */}
        {status === 'loading' && (
          <Badge variant="secondary" className="animate-pulse mb-2">
            ⏳ 处理中...
          </Badge>
        )}

        {status === 'error' && (
          <Badge variant="destructive" className="mb-2">
            ❌ 错误
          </Badge>
        )}

        {status === 'pending' && (
          <Badge variant="outline" className="mb-2">
            ⏳ 等待中...
          </Badge>
        )}

        {/* Output */}
        {output && (
          <Content {...contentProps}>
            <pre className="bg-white dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto border border-gray-200 dark:border-gray-800">
              {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
            </pre>
          </Content>
        )}

        {/* Empty state */}
        {!output && status === 'loading' && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            处理中...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
