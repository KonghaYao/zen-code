/**
 * PostmanView — Full-featured HTTP client
 *
 * Layout (desktop):
 * ┌──────────────┬──────────────────────────────┬───────────────┐
 * │  Sidebar     │        Request Editor         │  Response     │
 * │  Collections │  URL bar + Method             │               │
 * │  & History   │  Tabs: Params|Headers|Auth|   │  Status       │
 * │  (tabbed)    │        Body                   │  Headers      │
 * │              │                               │  Body         │
 * └──────────────┴──────────────────────────────-┴───────────────┘
 */

import { useState, useCallback } from 'react';
import {
    useActiveEnvironment,
    useCollections,
    useSendRequest,
    useUpdateRequest,
    useCreateRequest,
} from '../../hooks/usePostman.js';
import { Modal } from '../../components/Modal.js';
import { CollectionSidebar } from '../../components/postman/CollectionSidebar.js';
import { ResponsePanel } from '../../components/postman/ResponsePanel.js';
import { KeyValueEditor } from '../../components/postman/KeyValueEditor.js';
import { AuthEditor } from '../../components/postman/AuthEditor.js';
import { BodyEditor } from '../../components/postman/BodyEditor.js';
import { HistoryPanel } from '../../components/postman/HistoryPanel.js';
import { EnvironmentManager } from '../../components/postman/EnvironmentManager.js';
import { ImportMenu } from '../../components/postman/ImportMenu.js';
import { isCurlCommand, parseCurl } from '../../utils/curlParser.js';
import type { ActiveRequest, SendRequestResult, HistoryEntry, HttpMethod } from '../../types/postman.js';
import { DEFAULT_REQUEST, HTTP_METHODS, METHOD_COLORS } from '../../types/postman.js';

type RequestTab = 'params' | 'headers' | 'auth' | 'body';

const REQUEST_TABS: { id: RequestTab; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'auth', label: 'Auth' },
    { id: 'body', label: 'Body' },
];

type SidebarTab = 'collections' | 'history';

export function PostmanView() {
    // Active request state
    const [activeRequest, setActiveRequest] = useState<ActiveRequest>({ ...DEFAULT_REQUEST });
    const [requestTab, setRequestTab] = useState<RequestTab>('params');
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('collections');

    // Response state
    const [response, setResponse] = useState<SendRequestResult | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Modal state
    const [showEnvManager, setShowEnvManager] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveToCollectionId, setSaveToCollectionId] = useState('');

    // Data hooks
    const activeEnvQuery = useActiveEnvironment();
    const collectionsQuery = useCollections();
    const sendMutation = useSendRequest();
    const updateRequestMutation = useUpdateRequest();
    const createRequestMutation = useCreateRequest();

    // Handle request load from sidebar or history
    const handleSelectRequest = useCallback((req: ActiveRequest) => {
        setActiveRequest(req);
        setResponse(null);
    }, []);

    const handleLoadHistory = useCallback((entry: HistoryEntry) => {
        setActiveRequest({
            name: entry.name ?? entry.url,
            method: entry.method,
            url: entry.url,
            headers: entry.headers,
            query_params: entry.query_params,
            auth: entry.auth,
            body: entry.body,
            isDirty: true,
        });
        setResponse(null);
        setSidebarTab('collections');
    }, []);

    const handleUrlChange = useCallback((url: string) => {
        // Detect curl paste in URL bar
        if (isCurlCommand(url)) {
            const parsed = parseCurl(url.trim());
            if (parsed) {
                const confirmed = window.confirm('检测到 curl 命令，是否导入？');
                if (confirmed) {
                    setActiveRequest((prev) => ({
                        ...prev,
                        method: parsed.method,
                        url: parsed.url,
                        headers: parsed.headers,
                        query_params: parsed.query_params,
                        auth: parsed.auth,
                        body: parsed.body,
                        isDirty: true,
                    }));
                    return;
                }
            }
        }
        setActiveRequest((prev) => ({ ...prev, url, isDirty: true }));
    }, []);

    const handleImport = useCallback((requests: ActiveRequest[]) => {
        if (requests.length === 0) return;
        // Load the first request into the editor
        setActiveRequest({ ...requests[0], isDirty: true });
        setResponse(null);
    }, []);

    // Send request
    const handleSend = useCallback(async () => {
        if (!activeRequest.url.trim()) return;
        setIsSending(true);
        setResponse(null);
        try {
            const result = await sendMutation.mutateAsync({
                method: activeRequest.method,
                url: activeRequest.url,
                headers: activeRequest.headers,
                query_params: activeRequest.query_params,
                auth: activeRequest.auth,
                body: activeRequest.body,
                request_id: activeRequest.id,
                collection_id: activeRequest.collection_id,
                name: activeRequest.name,
                save_to_history: true,
            });
            setResponse(result as SendRequestResult);
        } catch (err) {
            setResponse({
                status: 0,
                status_text: 'Error',
                headers: {},
                body: '',
                time_ms: 0,
                size_bytes: 0,
                error: String(err),
            });
        } finally {
            setIsSending(false);
        }
    }, [activeRequest, sendMutation]);

    // Save request
    const handleSave = useCallback(() => {
        if (activeRequest.id) {
            updateRequestMutation.mutate({
                id: activeRequest.id,
                name: activeRequest.name,
                method: activeRequest.method,
                url: activeRequest.url,
                headers: activeRequest.headers,
                query_params: activeRequest.query_params,
                auth: activeRequest.auth,
                body: activeRequest.body,
            });
            setActiveRequest((prev) => ({ ...prev, isDirty: false }));
        } else {
            setShowSaveDialog(true);
        }
    }, [activeRequest, updateRequestMutation]);

    const handleSaveNew = useCallback(() => {
        if (!saveToCollectionId) return;
        createRequestMutation.mutate(
            {
                id: crypto.randomUUID(),
                collection_id: saveToCollectionId,
                name: activeRequest.name,
                method: activeRequest.method,
                url: activeRequest.url,
                headers: activeRequest.headers,
                query_params: activeRequest.query_params,
                auth: activeRequest.auth,
                body: activeRequest.body,
            },
            {
                onSuccess: () => setShowSaveDialog(false),
            },
        );
    }, [saveToCollectionId, activeRequest, createRequestMutation]);

    const updateRequest = useCallback((patch: Partial<ActiveRequest>) => {
        setActiveRequest((prev) => ({ ...prev, ...patch, isDirty: true }));
    }, []);

    // Count non-empty params / headers for badges
    const paramCount = activeRequest.query_params.filter((p) => p.enabled && p.key).length;
    const headerCount = activeRequest.headers.filter((h) => h.enabled && h.key).length;
    const hasBody = activeRequest.body.type !== 'none' && activeRequest.body.content;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-bg-primary">
            {/* ── Top bar ───────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border-subtle bg-bg-secondary">
                {/* Request name */}
                <input
                    type="text"
                    value={activeRequest.name}
                    onChange={(e) => updateRequest({ name: e.target.value })}
                    className="text-sm font-medium bg-transparent focus:outline-none text-text-primary min-w-0 w-40 border-b border-transparent focus:border-border-default"
                    placeholder="Request name"
                />
                {activeRequest.isDirty && (
                    <span className="text-xs text-amber-500 flex-shrink-0" title="Unsaved changes">
                        ●
                    </span>
                )}

                <div className="flex-1" />

                {/* Active environment badge */}
                <button
                    onClick={() => setShowEnvManager(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        activeEnvQuery.data
                            ? 'border-success/40 bg-success-light text-success hover:bg-success/20'
                            : 'border-border-subtle text-text-muted hover:bg-bg-hover'
                    }`}
                >
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${activeEnvQuery.data ? 'bg-success' : 'bg-neutral-300'}`}
                    />
                    {activeEnvQuery.data ? activeEnvQuery.data.name : 'No Environment'}
                </button>

                {/* Save button */}
                {activeRequest.isDirty && (
                    <button
                        onClick={handleSave}
                        disabled={updateRequestMutation.isPending}
                        className="px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border-subtle rounded-lg text-text-secondary transition-colors disabled:opacity-50"
                    >
                        {updateRequestMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                )}

                {/* Import menu */}
                <ImportMenu onImport={handleImport} />

                {/* New request */}
                <button
                    onClick={() => {
                        setActiveRequest({ ...DEFAULT_REQUEST });
                        setResponse(null);
                    }}
                    className="px-3 py-1 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border-subtle rounded-lg text-text-secondary transition-colors"
                >
                    + New
                </button>
            </div>

            {/* ── Main layout ───────────────────────────────────── */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* LEFT SIDEBAR */}
                <div className="w-64 flex-shrink-0 border-r border-border-subtle flex flex-col min-h-0 bg-bg-secondary">
                    {/* Sidebar tab switcher */}
                    <div className="flex-shrink-0 flex border-b border-border-subtle">
                        {(['collections', 'history'] as SidebarTab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setSidebarTab(t)}
                                className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                                    sidebarTab === t
                                        ? 'text-primary border-b-2 border-primary bg-primary-light/20'
                                        : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        {sidebarTab === 'collections' ? (
                            <CollectionSidebar
                                onSelectRequest={handleSelectRequest}
                                activeRequestId={activeRequest.id}
                            />
                        ) : (
                            <HistoryPanel onLoadHistory={handleLoadHistory} />
                        )}
                    </div>
                </div>

                {/* CENTER + RIGHT: Request editor + Response */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* URL bar */}
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-secondary">
                        {/* Method selector */}
                        <select
                            value={activeRequest.method}
                            onChange={(e) => updateRequest({ method: e.target.value as HttpMethod })}
                            className={`px-2 py-1.5 text-xs font-bold rounded-lg border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white w-24 ${METHOD_COLORS[activeRequest.method]}`}
                        >
                            {HTTP_METHODS.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>

                        {/* URL input */}
                        <input
                            type="text"
                            value={activeRequest.url}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="https://api.example.com/endpoint"
                            className="flex-1 px-3 py-1.5 text-sm font-mono border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                            spellCheck={false}
                        />

                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={isSending || !activeRequest.url.trim()}
                            className="px-5 py-1.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 min-w-20"
                        >
                            {isSending ? '...' : 'Send'}
                        </button>
                    </div>

                    {/* Request tabs */}
                    <div className="flex-shrink-0 flex items-center gap-0 px-4 border-b border-border-subtle bg-bg-secondary">
                        {REQUEST_TABS.map((tab) => {
                            let badge: number | string | null = null;
                            if (tab.id === 'params' && paramCount > 0) badge = paramCount;
                            if (tab.id === 'headers' && headerCount > 0) badge = headerCount;
                            if (tab.id === 'body' && hasBody) badge = '•';

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setRequestTab(tab.id)}
                                    className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                                        requestTab === tab.id
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    {tab.label}
                                    {badge != null && (
                                        <span className="px-1 py-0.5 text-xs bg-primary-light text-primary rounded-full leading-none min-w-4 text-center">
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Request tab content - scrollable up to max height */}
                    <div
                        className="flex-shrink-0 overflow-y-auto border-b border-border-subtle bg-white"
                        style={{ maxHeight: '220px', minHeight: '80px' }}
                    >
                        {requestTab === 'params' && (
                            <div className="p-2">
                                <KeyValueEditor
                                    pairs={activeRequest.query_params}
                                    onChange={(pairs) => updateRequest({ query_params: pairs })}
                                    keyPlaceholder="Parameter"
                                    valuePlaceholder="Value"
                                />
                            </div>
                        )}
                        {requestTab === 'headers' && (
                            <div className="p-2">
                                <KeyValueEditor
                                    pairs={activeRequest.headers}
                                    onChange={(pairs) => updateRequest({ headers: pairs })}
                                    keyPlaceholder="Header"
                                    valuePlaceholder="Value"
                                />
                            </div>
                        )}
                        {requestTab === 'auth' && (
                            <AuthEditor auth={activeRequest.auth} onChange={(auth) => updateRequest({ auth })} />
                        )}
                        {requestTab === 'body' && (
                            <BodyEditor body={activeRequest.body} onChange={(body) => updateRequest({ body })} />
                        )}
                    </div>

                    {/* Response panel - takes remaining height */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ResponsePanel response={response} isLoading={isSending} />
                    </div>
                </div>
            </div>

            {/* Environment Manager Modal */}
            <Modal open={showEnvManager} onClose={() => setShowEnvManager(false)} title="Environment Manager" size="lg">
                <div style={{ height: '420px' }}>
                    <EnvironmentManager onClose={() => setShowEnvManager(false)} />
                </div>
            </Modal>

            {/* Save to Collection Dialog */}
            <Modal
                open={showSaveDialog}
                onClose={() => setShowSaveDialog(false)}
                title="Save Request to Collection"
                size="sm"
            >
                <div className="p-2 space-y-4">
                    <div>
                        <label className="block text-xs text-text-muted mb-1">Request Name</label>
                        <input
                            type="text"
                            value={activeRequest.name}
                            onChange={(e) => updateRequest({ name: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-text-muted mb-1">Collection</label>
                        <select
                            value={saveToCollectionId}
                            onChange={(e) => setSaveToCollectionId(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                        >
                            <option value="">Select a collection...</option>
                            {(collectionsQuery.data as import('../../types/postman.js').Collection[] | undefined)?.map(
                                (col) => (
                                    <option key={col.id} value={col.id}>
                                        {col.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowSaveDialog(false)}
                            className="px-4 py-1.5 text-sm border border-border-subtle rounded-lg hover:bg-bg-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNew}
                            disabled={!saveToCollectionId || createRequestMutation.isPending}
                            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
