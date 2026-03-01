/**
 * 进程日志查看器组件
 */

import { useEffect, useRef } from 'react';

interface ProcessLogProps {
    logs: string[];
    isLoading?: boolean;
}

export function ProcessLog({ logs, isLoading }: ProcessLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-white border-t border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">进程日志</h3>
                {isLoading && <span className="text-xs text-text-muted">加载中...</span>}
            </div>

            <div ref={scrollRef} className="h-64 overflow-y-auto bg-bg-tertiary rounded-md p-3 font-mono text-xs">
                {logs.length === 0 ? (
                    <p className="text-text-muted">没有日志</p>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log, index) => (
                            <div key={index} className="text-text-primary break-all">
                                {log}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
