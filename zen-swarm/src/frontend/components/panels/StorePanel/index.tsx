/**
 * StorePanel — 远程 prompt/skill 仓库浏览与导入面板
 */

import { useState } from 'react';
import { TrafficLights } from '../../ui/TrafficLights.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';
import { StoreCard } from './StoreCard.js';
import { StorePreview } from './StorePreview.js';
import {
    useStores,
    useRemotePrompts,
    useRemoteSkills,
    useGetRemoteSkill,
    useSearchRemotePrompts,
    useSearchRemoteSkills,
    useImportPrompt,
    useImportSkill,
} from '../../../hooks/useStore.js';

type TabType = 'prompts' | 'skills';

interface StorePanelProps {
    onClose?: () => void;
}

export function StorePanel({ onClose }: StorePanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('prompts');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
    const [importingId, setImportingId] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSkillName, setPreviewSkillName] = useState('');

    // ── Store 列表 ──
    const { data: stores = [] } = useStores();
    const currentStoreId = selectedStoreId || stores[0]?.id || '';

    // ── 按需拉取 skill 完整内容（preview 时触发）──
    const { data: fetchedSkill, isFetching: fetchingSkill } = useGetRemoteSkill(
        activeTab === 'skills' ? currentStoreId : '',
        previewSkillName,
    );

    // ── 列出远程内容 ──
    const {
        data: remotePrompts = [],
        isLoading: loadingPrompts,
        error: promptsError,
        refetch: refetchPrompts,
    } = useRemotePrompts(activeTab === 'prompts' ? currentStoreId : '');

    const {
        data: remoteSkills = [],
        isLoading: loadingSkills,
        error: skillsError,
        refetch: refetchSkills,
    } = useRemoteSkills(activeTab === 'skills' ? currentStoreId : '');

    // ── 搜索 ──
    const { data: searchedPrompts, isFetching: searchingPrompts } = useSearchRemotePrompts(
        activeTab === 'prompts' ? currentStoreId : '',
        searchQuery,
    );

    const { data: searchedSkills, isFetching: searchingSkills } = useSearchRemoteSkills(
        activeTab === 'skills' ? currentStoreId : '',
        searchQuery,
    );

    // ── 导入 mutations ──
    const importPromptMutation = useImportPrompt();
    const importSkillMutation = useImportSkill();

    // ── 显示数据 ──
    const displayPrompts = searchQuery.length > 1 ? (searchedPrompts ?? []) : remotePrompts;
    const displaySkills = searchQuery.length > 1 ? (searchedSkills ?? []) : remoteSkills;

    const isLoading = activeTab === 'prompts' ? loadingPrompts || searchingPrompts : loadingSkills || searchingSkills;

    const error = activeTab === 'prompts' ? promptsError : skillsError;

    const handleImportPrompt = (promptId: string) => {
        if (!currentStoreId) return;
        setImportingId(promptId);
        importPromptMutation.mutate(
            { storeId: currentStoreId, promptId },
            {
                onSuccess: () => {
                    setImportedIds((prev) => new Set([...prev, promptId]));
                    setImportingId(null);
                },
                onError: () => setImportingId(null),
            },
        );
    };

    const handleImportSkill = (skillName: string) => {
        if (!currentStoreId) return;
        setImportingId(skillName);
        importSkillMutation.mutate(
            { storeId: currentStoreId, skillName },
            {
                onSuccess: () => {
                    setImportedIds((prev) => new Set([...prev, skillName]));
                    setImportingId(null);
                },
                onError: () => setImportingId(null),
            },
        );
    };

    const handlePreview = (item: any) => {
        setPreviewItem(item);
        setPreviewOpen(true);
        if (activeTab === 'skills') {
            setPreviewSkillName(item.name);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-shrink-0 bg-transparent px-4 py-3 flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <TrafficLights onClose={onClose} />
                    <h2 className="text-xl font-semibold text-text-primary ml-2">Store</h2>
                </div>

                {stores.length > 0 && (
                    <select
                        value={currentStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {stores.map((s: any) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                )}
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-border-subtle px-4">
                {(['prompts', 'skills'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setSearchQuery('');
                        }}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                            activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border-subtle">
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {stores.length === 0 && (
                    <EmptyState message="No remote stores configured. Add a store on the left sidebar." />
                )}

                {stores.length > 0 && !currentStoreId && <EmptyState message="Select a remote store to browse." />}

                {error && (
                    <ErrorDisplay
                        error={(error as any).message}
                        onRetry={() => (activeTab === 'prompts' ? refetchPrompts() : refetchSkills())}
                    />
                )}

                {isLoading && <div className="flex justify-center py-12 text-gray-400 text-sm">Loading...</div>}

                {!isLoading &&
                    !error &&
                    activeTab === 'prompts' &&
                    (displayPrompts as any[]).length === 0 &&
                    currentStoreId && <EmptyState message="No prompts found." />}

                {!isLoading &&
                    !error &&
                    activeTab === 'skills' &&
                    (displaySkills as any[]).length === 0 &&
                    currentStoreId && <EmptyState message="No skills found." />}

                {!isLoading &&
                    !error &&
                    activeTab === 'prompts' &&
                    (displayPrompts as any[]).map((prompt: any) => (
                        <StoreCard
                            key={prompt.id}
                            item={prompt}
                            type="prompt"
                            isImported={importedIds.has(prompt.id)}
                            isImporting={importingId === prompt.id}
                            onPreview={() => handlePreview(prompt)}
                            onImport={() => handleImportPrompt(prompt.id)}
                        />
                    ))}

                {!isLoading &&
                    !error &&
                    activeTab === 'skills' &&
                    (displaySkills as any[]).map((skill: any) => (
                        <StoreCard
                            key={skill.name}
                            item={skill}
                            type="skill"
                            isImported={importedIds.has(skill.name)}
                            isImporting={importingId === skill.name}
                            onPreview={() => handlePreview(skill)}
                            onImport={() => handleImportSkill(skill.name)}
                        />
                    ))}
            </div>

            {/* Preview Modal */}
            <StorePreview
                open={previewOpen}
                item={
                    previewItem
                        ? {
                              ...previewItem,
                              content:
                                  activeTab === 'skills' && fetchedSkill
                                      ? fetchedSkill.content
                                      : (previewItem.content ?? ''),
                          }
                        : null
                }
                type={activeTab === 'prompts' ? 'prompt' : 'skill'}
                isContentLoading={activeTab === 'skills' && fetchingSkill}
                onClose={() => {
                    setPreviewOpen(false);
                    setPreviewSkillName('');
                }}
                onImport={() => {
                    if (!previewItem) return;
                    if (activeTab === 'prompts') handleImportPrompt(previewItem.id);
                    else handleImportSkill(previewItem.name);
                    setPreviewOpen(false);
                }}
                isImported={previewItem ? importedIds.has(previewItem.id ?? previewItem.name) : false}
                isImporting={previewItem ? importingId === (previewItem.id ?? previewItem.name) : false}
            />
        </div>
    );
}
