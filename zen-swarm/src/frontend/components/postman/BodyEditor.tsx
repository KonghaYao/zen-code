/**
 * BodyEditor — select body type and edit content
 * 增加 JSON Format/Minify 工具栏 + 实时错误提示
 */

import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { RequestBody, BodyType } from '../../types/postman.js';

interface BodyEditorProps {
    body: RequestBody;
    onChange: (body: RequestBody) => void;
}

export interface BodyEditorHandle {
    formatJson: () => void;
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'form', label: 'Form URL Encoded' },
    { value: 'text', label: 'Plain Text' },
    { value: 'binary', label: 'Binary' },
];

export const BodyEditor = forwardRef<BodyEditorHandle, BodyEditorProps>(function BodyEditor({ body, onChange }, ref) {
    const [jsonError, setJsonError] = useState<string | null>(null);
    const isTextual = body.type !== 'none' && body.type !== 'binary';

    const handleContentChange = useCallback(
        (val: string) => {
            onChange({ ...body, content: val });
            if (body.type === 'json') {
                if (!val.trim()) {
                    setJsonError(null);
                    return;
                }
                try {
                    JSON.parse(val);
                    setJsonError(null);
                } catch (e) {
                    setJsonError((e as Error).message);
                }
            }
        },
        [body, onChange],
    );

    const handleFormat = useCallback(() => {
        if (body.type !== 'json' || jsonError) return;
        try {
            const formatted = JSON.stringify(JSON.parse(body.content), null, 2);
            onChange({ ...body, content: formatted });
        } catch {
            // already validated
        }
    }, [body, jsonError, onChange]);

    const handleMinify = useCallback(() => {
        if (body.type !== 'json' || jsonError) return;
        try {
            const minified = JSON.stringify(JSON.parse(body.content));
            onChange({ ...body, content: minified });
        } catch {
            // already validated
        }
    }, [body, jsonError, onChange]);

    // 暴露 formatJson 给父组件（Cmd+Shift+F）
    useImperativeHandle(ref, () => ({ formatJson: handleFormat }), [handleFormat]);

    return (
        <div className="flex flex-col gap-2 p-3">
            {/* Type selector */}
            <div className="flex gap-1 flex-wrap">
                {BODY_TYPES.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => {
                            onChange({ ...body, type: t.value });
                            setJsonError(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            body.type === t.value
                                ? 'bg-primary text-white'
                                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* JSON toolbar */}
            {body.type === 'json' && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFormat}
                        disabled={!!jsonError || !body.content.trim()}
                        className="px-2 py-0.5 text-xs border border-border-subtle rounded hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="格式化 JSON (Cmd+Shift+F)"
                    >
                        Format
                    </button>
                    <button
                        onClick={handleMinify}
                        disabled={!!jsonError || !body.content.trim()}
                        className="px-2 py-0.5 text-xs border border-border-subtle rounded hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Minify
                    </button>
                    {jsonError && (
                        <span className="text-xs text-red-500 truncate flex-1" title={jsonError}>
                            ✗ {jsonError}
                        </span>
                    )}
                </div>
            )}

            {/* Editor */}
            {isTextual && (
                <textarea
                    value={body.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={
                        body.type === 'json'
                            ? '{\n  "key": "value"\n}'
                            : body.type === 'form'
                              ? 'key1=value1&key2=value2'
                              : 'Enter plain text...'
                    }
                    className={`w-full h-40 px-3 py-2 text-xs font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-neutral-50 resize-none ${
                        jsonError ? 'border-red-400 focus:border-red-400' : 'border-border-subtle focus:border-primary'
                    }`}
                    spellCheck={false}
                />
            )}

            {body.type === 'none' && <p className="text-xs text-text-muted italic">This request has no body.</p>}

            {body.type === 'binary' && (
                <p className="text-xs text-text-muted italic">Binary upload not supported in this client.</p>
            )}
        </div>
    );
});
