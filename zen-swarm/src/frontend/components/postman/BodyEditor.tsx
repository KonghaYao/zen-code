/**
 * BodyEditor — select body type and edit content
 */

import type { RequestBody, BodyType } from '../../types/postman.js';

interface BodyEditorProps {
    body: RequestBody;
    onChange: (body: RequestBody) => void;
}

const BODY_TYPES: { value: BodyType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'json', label: 'JSON' },
    { value: 'form', label: 'Form URL Encoded' },
    { value: 'text', label: 'Plain Text' },
    { value: 'binary', label: 'Binary' },
];

export function BodyEditor({ body, onChange }: BodyEditorProps) {
    const isTextual = body.type !== 'none' && body.type !== 'binary';

    return (
        <div className="flex flex-col gap-2 p-3">
            {/* Type selector */}
            <div className="flex gap-1 flex-wrap">
                {BODY_TYPES.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => onChange({ ...body, type: t.value })}
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

            {/* Editor */}
            {isTextual && (
                <textarea
                    value={body.content}
                    onChange={(e) => onChange({ ...body, content: e.target.value })}
                    placeholder={
                        body.type === 'json'
                            ? '{\n  "key": "value"\n}'
                            : body.type === 'form'
                              ? 'key1=value1&key2=value2'
                              : 'Enter plain text...'
                    }
                    className="w-full h-40 px-3 py-2 text-xs font-mono border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-neutral-50 resize-none"
                    spellCheck={false}
                />
            )}

            {body.type === 'none' && <p className="text-xs text-text-muted italic">This request has no body.</p>}

            {body.type === 'binary' && (
                <p className="text-xs text-text-muted italic">Binary upload not supported in this client.</p>
            )}
        </div>
    );
}
