/**
 * ImportMenu — Dropdown for importing curl or .http files
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { parseCurl } from '../../utils/curlParser.js';
import { parseHttpFile } from '../../utils/httpFileParser.js';
import type { ActiveRequest } from '../../types/postman.js';
import type { ParsedCurl } from '../../utils/curlParser.js';

interface ImportMenuProps {
    onImport: (requests: ActiveRequest[]) => void;
}

function parsedToActive(parsed: ParsedCurl & { name?: string }): ActiveRequest {
    return {
        name: parsed.name ?? `${parsed.method} ${parsed.url}`,
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        query_params: parsed.query_params,
        auth: parsed.auth,
        body: parsed.body,
        isDirty: true,
    };
}

export function ImportMenu({ onImport }: ImportMenuProps) {
    const [open, setOpen] = useState(false);
    const [showPasteCurl, setShowPasteCurl] = useState(false);
    const [curlText, setCurlText] = useState('');
    const [error, setError] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleImportCurl = useCallback(() => {
        setError('');
        const result = parseCurl(curlText.trim());
        if (!result) {
            setError('Could not parse curl command. Make sure it starts with "curl ".');
            return;
        }
        onImport([parsedToActive(result)]);
        setCurlText('');
        setShowPasteCurl(false);
        setOpen(false);
    }, [curlText, onImport]);

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const content = await file.text();
            const parsed = parseHttpFile(content);
            if (parsed.length === 0) {
                alert('No valid requests found in the .http file.');
                return;
            }
            onImport(parsed.map(parsedToActive));
            setOpen(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        [onImport],
    );

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border-subtle rounded-lg text-text-secondary transition-colors flex items-center gap-1"
            >
                Import
                <span className="text-text-muted">▾</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border-subtle rounded-lg shadow-lg py-1 min-w-44">
                    <button
                        onClick={() => {
                            setShowPasteCurl(true);
                            setOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        Paste cURL
                    </button>
                    <button
                        onClick={() => {
                            fileInputRef.current?.click();
                            setOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover transition-colors"
                    >
                        Import .http file
                    </button>
                </div>
            )}

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept=".http,.rest" className="hidden" onChange={handleFileSelect} />

            {/* Paste cURL modal */}
            {showPasteCurl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={(e) => e.target === e.currentTarget && setShowPasteCurl(false)}
                >
                    <div className="bg-white rounded-xl shadow-2xl p-4 w-full max-w-lg">
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Paste cURL Command</h3>
                        <textarea
                            autoFocus
                            value={curlText}
                            onChange={(e) => setCurlText(e.target.value)}
                            placeholder={`curl 'https://api.example.com/users' \\\n  -H 'Authorization: Bearer TOKEN'`}
                            className="w-full h-32 px-3 py-2 text-xs font-mono border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            spellCheck={false}
                        />
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                        <div className="flex justify-end gap-2 mt-3">
                            <button
                                onClick={() => {
                                    setShowPasteCurl(false);
                                    setError('');
                                    setCurlText('');
                                }}
                                className="px-3 py-1.5 text-xs border border-border-subtle rounded-lg hover:bg-bg-hover transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportCurl}
                                disabled={!curlText.trim()}
                                className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
