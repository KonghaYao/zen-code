/**
 * useRalphLoop Hook
 *
 * Ralph 自动循环模式：持续向 agent 发送消息，直到 agent 回复包含
 * <COMPLETE></COMPLETE> 标记为止。
 *
 * ## 重构说明
 *
 * 原实现使用多个 useState + useRef 交织管理状态，存在以下问题：
 * 1. useEffect 内部直接调用 sendTextMessage（异步副作用），在 React StrictMode
 *    下会双重触发，导致消息被发送两次。
 * 2. ralphLoopRunningRef 和 prevMessagesLengthRef 游离在 React 状态之外，
 *    调试困难。
 * 3. sendTextMessage 的 useCallback 依赖中故意省略了 ralphLoopRunningRef，
 *    缺少说明，容易被误认为是 bug。
 *
 * 现在使用 useReducer 将所有状态收拢到一个显式状态机：
 * - idle        ：初始/已完成状态
 * - waitSend    ：等待发出第一条/下一条消息（100ms 防抖后触发）
 * - waitReply   ：消息已发出，等待 agent 回复（loading=true）
 * - checkReply  ：loading 结束，检查最新消息内容
 *
 * Effect 只负责"观察外部变化 → dispatch action"，真正的异步发送由
 * event handler（startRalphLoop）和 useTimeout 触发，符合 Vercel 最佳实践：
 * "rerender-move-effect-to-event"
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { useTimeout } from 'usehooks-ts';
import { getTextContent, Message, RenderMessage } from '@langgraph-js/sdk';
import { notify } from '../../utils/notify';
import { metadataOfChat } from '../../utils/metadata';

// ============================================================================
// State Machine Types
// ============================================================================

type RalphStatus =
    | 'idle' // 未启动 / 已完成
    | 'waitSend' // 100ms 防抖计时中，即将发送消息
    | 'waitReply' // 消息已发出，等待 agent 回复（loading=true）
    | 'checkReply'; // loading 结束，需要检查最新消息

interface RalphState {
    status: RalphStatus;
    /** 当前循环任务文本 */
    text: string | null;
    /** 上次检查时的消息数量，用于判断是否有新消息到达 */
    prevMessagesLength: number;
}

type RalphAction =
    | { type: 'START'; text: string }
    | { type: 'SEND' } // 防抖结束，准备发送
    | { type: 'SENT' } // 消息已发出，进入等待回复状态
    | { type: 'COMPLETE' } // agent 回复了 <COMPLETE>，结束循环
    | { type: 'CONTINUE'; prevLength: number } // agent 回复了普通内容，继续循环
    | { type: 'RESET' }; // 强制重置

function ralphReducer(state: RalphState, action: RalphAction): RalphState {
    switch (action.type) {
        case 'START':
            return { status: 'waitSend', text: action.text, prevMessagesLength: 0 };

        case 'SEND':
            // 防抖结束后，将状态推进到"等待回复"
            return state.status === 'waitSend' ? { ...state, status: 'waitReply' } : state;

        case 'SENT':
            // 消息已经通过 sendMessage 发出（异步完成后调用）
            return state.status === 'waitReply'
                ? state // 保持 waitReply，等待 loading 变化
                : state;

        case 'COMPLETE':
            return { status: 'idle', text: null, prevMessagesLength: 0 };

        case 'CONTINUE':
            // 上一轮回复已确认，重新进入防抖等待
            return state.status === 'checkReply'
                ? { ...state, status: 'waitSend', prevMessagesLength: action.prevLength }
                : state;

        case 'RESET':
            return { status: 'idle', text: null, prevMessagesLength: 0 };

        default:
            return state;
    }
}

const INITIAL_STATE: RalphState = {
    status: 'idle',
    text: null,
    prevMessagesLength: 0,
};

// ============================================================================
// Hook
// ============================================================================

export interface UseRalphLoopParams {
    loading: boolean;
    renderMessages: RenderMessage[];
    sendMessage: (messages: Message[], options?: any) => Promise<void>;
    setUserInput: (value: string) => void;
    extraParams?: any;
}

export function useRalphLoop({ loading, renderMessages, sendMessage, setUserInput, extraParams }: UseRalphLoopParams) {
    const [ralphState, dispatch] = useReducer(ralphReducer, INITIAL_STATE);

    // 用 ref 暴露最新的 sendMessage / extraParams，避免将其加入 useCallback 依赖
    // 从而防止 executeCommand 在每次 extraParams 变化时重建
    const sendMessageRef = useRef(sendMessage);
    sendMessageRef.current = sendMessage;
    const extraParamsRef = useRef(extraParams);
    extraParamsRef.current = extraParams;

    // -----------------------------------------------------------------------
    // 发送消息的核心函数（不需要加入任何 useCallback 依赖）
    // -----------------------------------------------------------------------
    const sendTextMessage = useCallback(async (text: string) => {
        if (!text) return;

        const ralphContext =
            '\n\n[System Context: You are currently in Ralph loop mode. ' +
            'Continue executing the task based on previous context. ' +
            'Respond with <COMPLETE></COMPLETE> tag when the task is complete.]';

        const content: Message[] = [
            {
                type: 'human',
                content: text + ralphContext,
            },
        ];

        await sendMessageRef.current(content, {
            extraParams: extraParamsRef.current,
            metadata: metadataOfChat,
        });
    }, []); // 空依赖：通过 ref 读取最新值，函数引用永远稳定

    // -----------------------------------------------------------------------
    // 防抖计时器：waitSend 状态下等待 100ms 后触发发送
    // 使用 useTimeout（usehooks-ts）代替手动 setTimeout，自动处理清理
    // -----------------------------------------------------------------------
    useTimeout(
        () => {
            if (ralphState.status === 'waitSend' && ralphState.text) {
                // 推进状态机 → waitReply，然后发送消息
                dispatch({ type: 'SEND' });
                sendTextMessage(ralphState.text).catch((err) => {
                    console.error('[RalphLoop] sendTextMessage failed:', err);
                    dispatch({ type: 'RESET' });
                });
            }
        },
        ralphState.status === 'waitSend' ? 100 : null,
    );

    // -----------------------------------------------------------------------
    // Effect：观察 loading + renderMessages 变化，驱动状态机转移
    //
    // 职责限定：只 dispatch action，不直接调用 sendTextMessage
    // 这符合"rerender-move-effect-to-event"原则——真正的副作用
    // 由 event handler（useTimeout 回调）触发
    // -----------------------------------------------------------------------
    useEffect(() => {
        // 只在 waitReply 阶段（消息已发出、等待回复）处理
        if (ralphState.status !== 'waitReply') return;
        // loading 结束说明 agent 已经回复完毕
        if (loading) return;

        const currentLength = renderMessages.length;
        // 没有新消息，继续等待（防止 effect 重复触发）
        if (currentLength <= ralphState.prevMessagesLength) return;

        const lastMessage = renderMessages[currentLength - 1];
        const lastContent = getTextContent(lastMessage!);

        if (typeof lastContent === 'string' && lastContent.includes('<COMPLETE></COMPLETE>')) {
            dispatch({ type: 'COMPLETE' });
            notify('Ralph 循环完成');
        } else {
            // 继续循环：记录当前消息数量，重新进入 waitSend
            dispatch({ type: 'CONTINUE', prevLength: currentLength });
        }
    }, [loading, renderMessages, ralphState.status, ralphState.prevMessagesLength]);

    // -----------------------------------------------------------------------
    // 公开 API
    // -----------------------------------------------------------------------

    /** 启动 Ralph 循环 */
    const startRalphLoop = useCallback((text: string) => {
        dispatch({ type: 'START', text });
    }, []);

    return {
        /** 当前循环任务文本（null 表示未运行） */
        ralphLoopText: ralphState.text,
        startRalphLoop,
        /** 直接发送单条消息（不进入循环，保持向后兼容） */
        sendTextMessage,
    };
}
