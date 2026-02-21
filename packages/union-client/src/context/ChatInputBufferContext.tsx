import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useInterval } from 'usehooks-ts';

// ============================================================================
// 配置常量
// ============================================================================

/** 缓存消息超时时间（30分钟） */
const BUFFER_TIMEOUT = 30 * 60 * 1000;

/** 定期检查间隔（5分钟） */
const CHECK_INTERVAL = 5 * 60 * 1000;

export interface ChatInputBufferContextType {
    bufferedMessage: string;
    setBufferedMessage: (message: string) => void;
    clearBuffer: () => void;
}

const ChatInputBufferContext = createContext<ChatInputBufferContextType | null>(null);

export interface ChatInputBufferProviderProps {
    children: ReactNode;
}

export const ChatInputBufferProvider: React.FC<ChatInputBufferProviderProps> = ({ children }) => {
    const [internalBuffer, setInternalBuffer] = useState('');
    const lastAccessTimeRef = useRef<number>(Date.now());

    const clearBuffer = useCallback(() => {
        setInternalBuffer('');
    }, []);

    // 包装 setBufferedMessage，更新最后访问时间
    const setBufferedMessageWithTracking = useCallback((message: string) => {
        lastAccessTimeRef.current = Date.now();
        setInternalBuffer(message);
    }, []);

    // 定期检查并清理超时的缓存消息
    useInterval(() => {
        const now = Date.now();
        const elapsed = now - lastAccessTimeRef.current;

        if (elapsed > BUFFER_TIMEOUT) {
            clearBuffer();
        }
    }, CHECK_INTERVAL);

    const value: ChatInputBufferContextType = {
        bufferedMessage: internalBuffer,
        setBufferedMessage: setBufferedMessageWithTracking,
        clearBuffer,
    };

    return <ChatInputBufferContext.Provider value={value}>{children}</ChatInputBufferContext.Provider>;
};

export const useChatInputBuffer = (): ChatInputBufferContextType => {
    const context = useContext(ChatInputBufferContext);
    if (!context) {
        throw new Error('useChatInputBuffer must be used within ChatInputBufferProvider');
    }
    return context;
};
