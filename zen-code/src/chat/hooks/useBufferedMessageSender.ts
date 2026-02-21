/**
 * useBufferedMessageSender Hook
 *
 * Manages buffered message sending when loading completes.
 * Simplified version without redundant useCallback.
 *
 * Follows Vercel best practices:
 * - Effect with minimal dependencies
 * - Use useIsMounted to prevent race conditions
 */

import { useEffect } from 'react';
import { useIsMounted } from 'usehooks-ts';
import { useChat } from '@langgraph-js/sdk/react';
import { useChatInputBuffer } from '@codegraph/union-client';
import { notify } from '../../utils/notify';
import { useSettings } from '../context/SettingsContext';

/**
 * Send buffered message when loading completes.
 * This hook handles the case where a message is buffered before the chat is ready.
 */
export function useBufferedMessageSender() {
    const { extraParams } = useSettings();
    const { sendMessage, loading } = useChat();
    const { bufferedMessage, clearBuffer } = useChatInputBuffer();
    const isMounted = useIsMounted();

    useEffect(() => {
        // Only send when not loading and there's a buffered message
        if (!loading && bufferedMessage.trim()) {
            const content = [
                {
                    type: 'human' as const,
                    content: bufferedMessage,
                },
            ];

            // 直接清理,不需要管异步流程
            clearBuffer();
            sendMessage(content, { extraParams })
                .then(() => {
                    notify('Zen Code 完成任务');
                })
                .catch((error) => {
                    console.error('Failed to send buffered message:', error);
                });
        }
    }, [loading, bufferedMessage, sendMessage, extraParams, clearBuffer, isMounted]);
}
