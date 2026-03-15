/**
 * Terminal 组件
 * xterm.js 封装，实现真实终端渲染
 *
 * 支持断线重连：重连时会自动恢复历史输出
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useTerminal } from '../../hooks/useTerminal.js';
import type { TerminalOptions, TerminalTheme } from './types.js';
import 'xterm/css/xterm.css';

// 默认主题（VS Code Dark+ 风格）
const DEFAULT_THEME: TerminalTheme = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
};

// 默认配置
const DEFAULT_OPTIONS: TerminalOptions = {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: DEFAULT_THEME,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000,
};

export interface TerminalRef {
    clear: () => void;
    write: (data: string) => void;
    focus: () => void;
}

interface TerminalProps {
    sessionId: string;
    options?: Partial<TerminalOptions>;
    onReady?: () => void;
    onError?: (error: Error) => void;
    /** 当 attach 到已有会话失败时（服务端找不到该 sessionId）触发，用于清除 pane 绑定 */
    onAttachError?: (sessionId: string) => void;
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>(function Terminal(
    { sessionId, options, onReady, onError, onAttachError },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [isReady, setIsReady] = useState(false);
    const hasAttachedRef = useRef(false); // 跟踪是否已附加到会话

    const { sendInput, resize, onOutput, wsStatus, attachSession } = useTerminal();

    // 使用 ref 存储最新的函数引用，避免闭包问题
    const sendInputRef = useRef(sendInput);
    const wsStatusRef = useRef(wsStatus);

    // 更新 ref
    useEffect(() => {
        sendInputRef.current = sendInput;
        wsStatusRef.current = wsStatus;
    });

    // 合并配置
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // 暴露方法给父组件
    useImperativeHandle(
        ref,
        () => ({
            clear: () => {
                xtermRef.current?.clear();
            },
            write: (data: string) => {
                xtermRef.current?.write(data);
            },
            focus: () => {
                xtermRef.current?.focus();
            },
        }),
        [],
    );

    // 初始化 xterm.js
    useEffect(() => {
        if (!containerRef.current || xtermRef.current) return;

        const xterm = new XTerm({
            cursorBlink: mergedOptions.cursorBlink,
            cursorStyle: mergedOptions.cursorStyle,
            fontSize: mergedOptions.fontSize,
            fontFamily: mergedOptions.fontFamily,
            theme: mergedOptions.theme,
            scrollback: mergedOptions.scrollback,
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);

        xterm.open(containerRef.current);
        fitAddon.fit();

        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;

        // 立即聚焦终端
        xterm.focus();

        // 立即注册输出回调（在 setIsReady 之前，确保缓冲区消息能被正确处理）
        const outputUnsubscribe = onOutput(sessionId, (data) => {
            xterm.write(data);
        });

        // 用户输入发送到服务端
        // 使用 ref 获取最新的状态，避免闭包捕获旧值
        const dataDisposable = xterm.onData((data) => {
            if (wsStatusRef.current === 'connected') {
                sendInputRef.current(sessionId, data);
            }
        });

        setIsReady(true);
        onReady?.();

        return () => {
            outputUnsubscribe();
            dataDisposable.dispose();
            xterm.dispose();
            xtermRef.current = null;
            fitAddonRef.current = null;
            setIsReady(false);
            hasAttachedRef.current = false;
        };
    }, [sessionId, onOutput]); // 包含 onOutput 依赖

    // 重连恢复：WebSocket 重连后附加到已有会话并恢复历史输出
    useEffect(() => {
        if (!isReady || !xtermRef.current || wsStatus !== 'connected' || hasAttachedRef.current) return;

        // 标记已附加，避免重复附加
        hasAttachedRef.current = true;

        // 附加到会话并恢复历史输出；若会话不存在则触发 onAttachError 清除 pane 绑定
        attachSession(
            sessionId,
            (history) => {
                if (xtermRef.current && history.length > 0) {
                    // 清空当前终端内容
                    xtermRef.current.clear();
                    // 写入历史输出
                    history.forEach((line) => xtermRef.current?.write(line));
                }

                // attach 成功后，立即同步当前 xterm.js 的真实尺寸给后端
                // 重连前后窗口可能已经改变大小，必须重新对齐
                if (fitAddonRef.current && xtermRef.current) {
                    fitAddonRef.current.fit();
                    const dims = fitAddonRef.current.proposeDimensions();
                    if (dims) {
                        resize(sessionId, dims.cols, dims.rows);
                    }
                }
            },
            onAttachError,
        );
    }, [sessionId, isReady, wsStatus, attachSession, resize, onAttachError]);

    // 不再需要单独的监听输出 effect（已在初始化时注册）

    // 窗口大小变化时自动调整
    useEffect(() => {
        if (!isReady || !fitAddonRef.current) return;

        const handleResize = () => {
            if (fitAddonRef.current && xtermRef.current) {
                fitAddonRef.current.fit();
                // 只有 attach 成功后才向服务端发送 resize，避免用无效 sessionId 触发报错
                if (hasAttachedRef.current) {
                    const dims = fitAddonRef.current.proposeDimensions();
                    if (dims) {
                        resize(sessionId, dims.cols, dims.rows);
                    }
                }
            }
        };

        // 初始调整（仅调整 canvas，不发送 resize，attach 回调里会做完整同步）
        fitAddonRef.current.fit();

        // 监听窗口大小变化
        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [sessionId, isReady, resize]);

    return (
        <div
            ref={containerRef}
            className="h-full w-full"
            style={{
                backgroundColor: mergedOptions.theme.background,
                padding: '8px',
            }}
            onClick={() => xtermRef.current?.focus()}
        />
    );
});

export type { TerminalProps, TerminalOptions, TerminalTheme };
