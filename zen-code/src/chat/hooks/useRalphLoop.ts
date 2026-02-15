import { useState, useRef, useEffect, useCallback } from 'react';
import { getTextContent, Message, RenderMessage } from '@langgraph-js/sdk';
import { notify } from '../../utils/notify';
import { metadataOfChat } from '../../utils/metadata';

interface UseRalphLoopParams {
    loading: boolean;
    renderMessages: RenderMessage[];
    sendMessage: (messages: Message[], options?: any) => Promise<void>;
    setUserInput: (value: string) => void;
    extraParams?: any;
}

export function useRalphLoop({ loading, renderMessages, sendMessage, setUserInput, extraParams }: UseRalphLoopParams) {
    const [ralphLoopText, setRalphLoopText] = useState<string | null>(null);
    const ralphLoopRunningRef = useRef(false);
    const prevMessagesLengthRef = useRef(0);

    // 发送文本消息的内部函数
    const sendTextMessage = useCallback(
        async (inputValue: string) => {
            if (!inputValue) return;

            // 在 ralph 模式下，添加上下文提示 agent 当前处于循环模式
            const ralphContext = ralphLoopRunningRef.current
                ? '\n\n[System Context: You are currently in Ralph loop mode. Continue executing the task based on previous context. Respond with <COMPLETE></COMPLETE> tag when the task is complete.]'
                : '';

            const content: Message[] = [
                {
                    type: 'human',
                    content: inputValue + ralphContext,
                },
            ];

            await sendMessage(content, { extraParams, metadata: metadataOfChat });
        },
        [sendMessage, extraParams],
    );

    // Ralph 循环模式启动函数
    const startRalphLoop = useCallback(
        (text: string) => {
            setRalphLoopText(text);
            ralphLoopRunningRef.current = true;
            prevMessagesLengthRef.current = 0;

            // 立即发送第一条消息
            setTimeout(() => {
                sendTextMessage(text);
            }, 100);
        },
        [sendTextMessage],
    );

    // Ralph 循环逻辑：监控消息变化
    useEffect(() => {
        // 只在消息数量变化时检查（新消息到达）
        if (ralphLoopRunningRef.current && ralphLoopText && !loading) {
            const currentLength = renderMessages.length;

            // 检查是否有新消息
            if (currentLength > prevMessagesLengthRef.current) {
                prevMessagesLengthRef.current = currentLength;

                const lastMessage = renderMessages[currentLength - 1];
                const lastContent = getTextContent(lastMessage!);

                if (typeof lastContent === 'string' && lastContent.includes('<COMPLETE></COMPLETE>')) {
                    // 循环结束
                    ralphLoopRunningRef.current = false;
                    setRalphLoopText(null);
                    notify('Ralph 循环完成');
                } else {
                    // 继续循环
                    sendTextMessage(ralphLoopText);
                }
            }
        }
    }, [loading, renderMessages, ralphLoopText, sendTextMessage]);

    return {
        ralphLoopText,
        startRalphLoop,
        sendTextMessage,
    };
}
