/**
 * PostmanView — Full-featured HTTP client
 *
 * 布局：
 * ┌──────────────────────────────────────────────────┐
 * │  顶栏（name + env + save + import + new）         │
 * ├──────────────────────────────────────────────────┤
 * │  标签栏 <RequestTabs>                             │
 * ├──────────────────────────────────────────────────┤
 * │  URL bar                                         │
 * ├──────────────────────────────────────────────────┤
 * │  请求 tab 导航（params/headers/auth/body）        │
 * │  ┌────────────────────────────────────────────┐  │
 * │  │ 请求内容区（splitRatio%）ref=containerRef  │  │
 * │  ├────────────────────────────────────────────┤  │
 * │  │ <DragHandle>                               │  │
 * │  ├────────────────────────────────────────────┤  │
 * │  │ <ResponsePanel>（剩余高度）                │  │
 * │  └────────────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────┘
 */

import { useState, useCallback, useRef } from 'react';
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
import { BodyEditor, type BodyEditorHandle } from '../../components/postman/BodyEditor.js';
import { HistoryPanel } from '../../components/postman/HistoryPanel.js';
import { EnvironmentManager } from '../../components/postman/EnvironmentManager.js';
import { ImportMenu } from '../../components/postman/ImportMenu.js';
import { RequestTabs } from '../../components/postman/RequestTabs.js';
import { DragHandle, useSplitRatio } from '../../components/postman/DragHandle.js';
import { usePostmanTabs } from '../../hooks/usePostmanTabs.js';
import { usePostmanKeyboard } from '../../hooks/usePostmanKeyboard.js';
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
    // 多标签页状态
    const {
        tabs,
        activeTabId,
        activeTab,
        openNewTab,
        closeTab,
        setActiveTabId,
        openRequest,
        updateActiveRequest,
        setTabResponse,
        setTabSending,
        setActiveRequestTab,
        markSaved,
    } = usePostmanTabs();

    const activeRequest = activeTab?.request ?? { ...DEFAULT_REQUEST };
    const response = activeTab?.response ?? null;
    const isSending = activeTab?.isSending ?? false;
    const requestTab = activeTab?.requestTab ?? 'params';

    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('collections');

    // Modal state
    const [showEnvManager, setShowEnvManager] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveToCollectionId, setSaveToCollectionId] = useState('');

    // Refs
    const urlInputRef = useRef<HTMLInputElement>(null);
    const bodyEditorRef = useRef<BodyEditorHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 分割比例（持久化）
    const [splitRatio, setSplitRatio] = useSplitRatio('postman-split-ratio', 0.4);

    // Data hooks
    const activeEnvQuery = useActiveEnvironment();
    const collectionsQuery = useCollections();
    const sendMutation = useSendRequest();
    const updateRequestMutation = useUpdateRequest();
    const createRequestMutation = useCreateRequest();

    // Handle request load from sidebar or history
    const handleSelectRequest = useCallback(
        (req: ActiveRequest) => {
            openRequest(req);
        },
        [openRequest],
    );

    const handleLoadHistory = useCallback(
        (entry: HistoryEntry) => {
            openRequest({
                name: entry.name ?? entry.url,
                method: entry.method,
                url: entry.url,
                headers: entry.headers,
                query_params: entry.query_params,
                auth: entry.auth,
                body: entry.body,
                isDirty: true,
            });
            setSidebarTab('collections');
        },
        [openRequest],
    );

    const handleUrlChange = useCallback(
        (url: string) => {
            if (isCurlCommand(url)) {
                const parsed = parseCurl(url.trim());
                if (parsed) {
                    const confirmed = window.confirm('检测到 curl 命令，是否导入？');
                    if (confirmed) {
                        updateActiveRequest({
                            method: parsed.method,
                            url: parsed.url,
                            headers: parsed.headers,
                            query_params: parsed.query_params,
                            auth: parsed.auth,
                            body: parsed.body,
                        });
                        return;
                    }
                }
            }
            updateActiveRequest({ url });
        },
        [updateActiveRequest],
    );

    const handleImport = useCallback(
        (requests: ActiveRequest[]) => {
            if (requests.length === 0) return;
            openRequest({ ...requests[0], isDirty: true });
        },
        [openRequest],
    );

    // Send request
    const handleSend = useCallback(async () => {
        if (!activeRequest.url.trim()) return;
        const tabId = activeTabId;
        setTabSending(tabId, true);
        setTabResponse(tabId, null, true);
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
            setTabResponse(tabId, result as SendRequestResult, false);
        } catch (err) {
            setTabResponse(
                tabId,
                {
                    status: 0,
                    status_text: 'Error',
                    headers: {},
                    body: '',
                    time_ms: 0,
                    size_bytes: 0,
                    error: String(err),
                },
                false,
            );
        }
    }, [activeRequest, activeTabId, sendMutation, setTabResponse, setTabSending]);

    // Save request
    const handleSave = useCallback(() => {
        if (activeRequest.id) {
            updateRequestMutation.mutate(
                {
                    id: activeRequest.id,
                    name: activeRequest.name,
                    method: activeRequest.method,
                    url: activeRequest.url,
                    headers: activeRequest.headers,
                    query_params: activeRequest.query_params,
                    auth: activeRequest.auth,
                    body: activeRequest.body,
                },
                { onSuccess: () => markSaved() },
            );
        } else {
            setShowSaveDialog(true);
        }
    }, [activeRequest, updateRequestMutation, markSaved]);

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
                onSuccess: () => {
                    setShowSaveDialog(false);
                    markSaved();
                },
            },
        );
    }, [saveToCollectionId, activeRequest, createRequestMutation, markSaved]);

    // 快捷键
    usePostmanKeyboard({
        onSend: handleSend,
        onSave: handleSave,
        onNewTab: openNewTab,
        onCloseTab: () => closeTab(activeTabId),
        onFocusUrl: () => urlInputRef.current?.select(),
        onFormatBody: () => bodyEditorRef.current?.formatJson(),
    });

    // Count non-empty params / headers for badges
    const paramCount = activeRequest.query_params.filter((p) => p.enabled && p.key).length;
    const headerCount = activeRequest.headers.filter((h) => h.enabled && h.key).length;
    const hasBody = activeRequest.body.type !== 'none' && activeRequest.body.content;

    // tab 右侧工具栏
    const tabToolbar = (
        <>
            {/* Active environment badge */}
            <button
                onClick={() => setShowEnvManager(true)}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors flex-shrink-0 ${
                    activeEnvQuery.data
                        ? 'border-success/40 bg-success-light text-success hover:bg-success/20'
                        : 'border-border-subtle text-text-muted hover:bg-bg-hover'
                }`}
            >
                <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeEnvQuery.data ? 'bg-success' : 'bg-neutral-300'}`}
                />
                <span className="max-w-20 truncate">{activeEnvQuery.data ? activeEnvQuery.data.name : 'No Env'}</span>
            </button>

            {/* Save button */}
            {activeRequest.isDirty && (
                <button
                    onClick={handleSave}
                    disabled={updateRequestMutation.isPending}
                    className="px-2 py-0.5 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border-subtle rounded text-text-secondary transition-colors disabled:opacity-50 flex-shrink-0"
                    title="保存 (Cmd+S)"
                >
                    {updateRequestMutation.isPending ? '...' : 'Save'}
                </button>
            )}

            {/* Import menu */}
            <ImportMenu onImport={handleImport} />

            {/* New request */}
            <button
                onClick={openNewTab}
                className="px-2 py-0.5 text-xs bg-bg-tertiary hover:bg-bg-hover border border-border-subtle rounded text-text-secondary transition-colors flex-shrink-0"
                title="新建标签页 (Cmd+T)"
            >
                + New
            </button>
        </>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden bg-bg-primary">
            {/* ── Tab bar（含右侧工具栏）────────────────────────── */}
            <RequestTabs
                tabs={tabs}
                activeTabId={activeTabId}
                onSelect={setActiveTabId}
                onClose={closeTab}
                onNew={openNewTab}
                onRename={(id, name) => {
                    if (id === activeTabId) updateActiveRequest({ name });
                }}
                toolbar={tabToolbar}
            />

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

                {/* CENTER: Request editor + Response */}
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* URL bar */}
                    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-secondary">
                        {/* Method selector */}
                        <select
                            value={activeRequest.method}
                            onChange={(e) => updateActiveRequest({ method: e.target.value as HttpMethod })}
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
                            ref={urlInputRef}
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
                            title="发送 (Cmd+Enter)"
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
                                    onClick={() => setActiveRequestTab(tab.id as RequestTab)}
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

                    {/* 可拖拽的请求/响应区域 */}
                    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* 请求内容区 */}
                        <div
                            className="flex-shrink-0 overflow-y-auto border-b border-border-subtle bg-white"
                            style={{ height: `${splitRatio * 100}%` }}
                        >
                            {requestTab === 'params' && (
                                <div className="p-2">
                                    <KeyValueEditor
                                        pairs={activeRequest.query_params}
                                        onChange={(pairs) => updateActiveRequest({ query_params: pairs })}
                                        keyPlaceholder="Parameter"
                                        valuePlaceholder="Value"
                                    />
                                </div>
                            )}
                            {requestTab === 'headers' && (
                                <div className="p-2">
                                    <KeyValueEditor
                                        pairs={activeRequest.headers}
                                        onChange={(pairs) => updateActiveRequest({ headers: pairs })}
                                        keyPlaceholder="Header"
                                        valuePlaceholder="Value"
                                    />
                                </div>
                            )}
                            {requestTab === 'auth' && (
                                <AuthEditor
                                    auth={activeRequest.auth}
                                    onChange={(auth) => updateActiveRequest({ auth })}
                                />
                            )}
                            {requestTab === 'body' && (
                                <BodyEditor
                                    ref={bodyEditorRef}
                                    body={activeRequest.body}
                                    onChange={(body) => updateActiveRequest({ body })}
                                />
                            )}
                        </div>

                        {/* 拖拽分割线 */}
                        <DragHandle containerRef={containerRef} onRatioChange={setSplitRatio} />

                        {/* 响应面板（剩余高度） */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <ResponsePanel response={response} isLoading={isSending} />
                        </div>
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
                            onChange={(e) => updateActiveRequest({ name: e.target.value })}
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
