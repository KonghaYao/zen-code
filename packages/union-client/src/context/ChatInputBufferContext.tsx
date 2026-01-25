import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
    const [bufferedMessage, setBufferedMessage] = useState('');

    const clearBuffer = useCallback(() => {
        setBufferedMessage('');
    }, []);

    const value: ChatInputBufferContextType = {
        bufferedMessage,
        setBufferedMessage,
        clearBuffer,
    };

    return (
        <ChatInputBufferContext.Provider value={value}>
            {children}
        </ChatInputBufferContext.Provider>
    );
};

export const useChatInputBuffer = (): ChatInputBufferContextType => {
    const context = useContext(ChatInputBufferContext);
    if (!context) {
        throw new Error('useChatInputBuffer must be used within ChatInputBufferProvider');
    }
    return context;
};
