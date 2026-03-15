/**
 * usePostmanKeyboard — Postman 快捷键监听
 */

import { useEffect, useRef } from 'react';

interface KeyboardCallbacks {
    onSend?: () => void;
    onSave?: () => void;
    onNewTab?: () => void;
    onCloseTab?: () => void;
    onFocusUrl?: () => void;
    onFormatBody?: () => void;
}

export function usePostmanKeyboard(callbacks: KeyboardCallbacks) {
    // 用 ref 存储回调，避免频繁重新注册事件监听器
    const cbRef = useRef<KeyboardCallbacks>(callbacks);
    cbRef.current = callbacks;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const ctrl = isMac ? e.metaKey : e.ctrlKey;
            if (!ctrl) return;

            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    cbRef.current.onSend?.();
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    cbRef.current.onSave?.();
                    break;
                case 't':
                case 'T':
                    e.preventDefault();
                    cbRef.current.onNewTab?.();
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    cbRef.current.onCloseTab?.();
                    break;
                case 'l':
                case 'L':
                    e.preventDefault();
                    cbRef.current.onFocusUrl?.();
                    break;
                case 'f':
                case 'F':
                    if (e.shiftKey) {
                        e.preventDefault();
                        cbRef.current.onFormatBody?.();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
}
