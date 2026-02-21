import { useState, useEffect, useRef, useMemo } from 'react';
import { RenderMessage } from '@langgraph-js/sdk';

export interface SystemResources {
    cpuPercent: number;
    memoryRSS: number;
    memoryHeapUsed: number;
    memoryHeapTotal: number;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

/**
 * 计算 renderMessages 中从最新 human 消息开始的 token 使用量
 * 只计算 AI 消息的 output_tokens
 */
export function calculateTokenUsage(messages: RenderMessage[]): TokenUsage {
    if (!messages || messages.length === 0) {
        return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    }

    // 找到最新的 human 消息索引
    let lastHumanIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'human') {
            lastHumanIndex = i;
            break;
        }
    }

    // 如果没有 human 消息，返回 0
    if (lastHumanIndex === -1) {
        return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    }

    // 从 human 消息之后开始计算
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    for (let i = lastHumanIndex + 1; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.type === 'ai' && msg.usage_metadata) {
            inputTokens += msg.usage_metadata.input_tokens || 0;
            outputTokens += msg.usage_metadata.output_tokens || 0;
            totalTokens += msg.usage_metadata.total_tokens || 0;
        }
    }

    return { inputTokens, outputTokens, totalTokens };
}

/**
 * Hook: 计算 renderMessages 的 token 使用量
 */
export function useTokenUsage(messages: RenderMessage[]): TokenUsage {
    return useMemo(() => calculateTokenUsage(messages), [messages]);
}

/**
 * 格式化字节数为紧凑格式（压缩显示）
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0';
    if (bytes < 1024) return `${bytes}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}M`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

/**
 * 格式化 token 数为紧凑格式
 * < 1000: 原数字
 * >= 1000: 1.2k
 * >= 1000000: 1.2m
 */
export function formatTokens(tokens: number): string {
    if (tokens < 1000) return `${tokens}`;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
    return `${(tokens / 1000000).toFixed(1)}m`;
}

/**
 * 格式化时间为 HH:MM:SS 格式
 * @param ms 毫秒数
 * @returns 如 "00:05", "01:23", "02:34:56"
 */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Hook: Loading 计时器
 * @param isLoading 是否正在 loading
 * @returns loading 持续时间（毫秒）
 */
export function useLoadingTimer(isLoading: boolean): number {
    const [loadingDuration, setLoadingDuration] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isLoading) {
            // 开始 loading
            if (startTimeRef.current === null) {
                startTimeRef.current = Date.now();
                setLoadingDuration(0);
            }
            // 每秒更新一次
            intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    setLoadingDuration(Date.now() - startTimeRef.current);
                }
            }, 1000);
        } else {
            // 停止 loading
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            startTimeRef.current = null;
            setLoadingDuration(0);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isLoading]);

    return loadingDuration;
}

/**
 * Hook: 获取系统资源使用情况（CPU、内存）
 * 每 2 秒更新一次
 */
export function useSystemResources(): SystemResources {
    const [resources, setResources] = useState<SystemResources>({
        cpuPercent: 0,
        memoryRSS: 0,
        memoryHeapUsed: 0,
        memoryHeapTotal: 0,
    });

    useEffect(() => {
        let lastCpuUsage = process.cpuUsage();
        let lastTime = Date.now();

        const updateResources = () => {
            const currentTime = Date.now();
            const currentCpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();

            // 计算 CPU 使用率
            const elapsedTimeMs = currentTime - lastTime;
            const elapsedCpuUser = currentCpuUsage.user - lastCpuUsage.user;
            const elapsedCpuSystem = currentCpuUsage.system - lastCpuUsage.system;
            const totalCpuMicroseconds = elapsedCpuUser + elapsedCpuSystem;
            // CPU 使用率 = (CPU 时间 / 经过时间) * 100
            const cpuPercent = (totalCpuMicroseconds / 1000 / elapsedTimeMs) * 100;

            setResources({
                cpuPercent: Math.min(100, Math.max(0, cpuPercent)),
                memoryRSS: memoryUsage.rss,
                memoryHeapUsed: memoryUsage.heapUsed,
                memoryHeapTotal: memoryUsage.heapTotal,
            });

            lastCpuUsage = currentCpuUsage;
            lastTime = currentTime;
        };

        // 初始更新
        updateResources();

        // 每 2 秒更新一次
        const interval = setInterval(updateResources, 2000);

        return () => clearInterval(interval);
    }, []);

    return resources;
}

/**
 * 根据 CPU 使用率返回颜色
 */
export function getCpuColor(percent: number): string {
    if (percent < 50) return 'green';
    if (percent < 80) return 'yellow';
    return 'red';
}

/**
 * 根据内存使用率返回颜色
 */
export function getMemoryColor(heapUsed: number, heapTotal: number): string {
    if (heapTotal === 0) return 'gray';
    const percent = (heapUsed / heapTotal) * 100;
    if (percent < 50) return 'green';
    if (percent < 80) return 'yellow';
    return 'red';
}
