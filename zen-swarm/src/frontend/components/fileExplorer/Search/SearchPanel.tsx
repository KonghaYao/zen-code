/**
 * SearchPanel - 文件搜索面板
 *
 * 功能：
 * - 使用 ripgrep 搜索文件内容
 * - 仅搜索当前项目文件
 * - 实时搜索（带防抖）
 * - 点击结果跳转到对应位置
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../../../api.js';
import type { TreeNode } from '../FileTree/FileTree.js';

// ========================================
// Types
// ========================================

interface SearchResult {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
}

interface SearchPanelProps {
    rootPath: string;
    onResultClick?: (result: SearchResult) => void;
}

interface SearchState {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    error: string | null;
}

// ========================================
// Helper Functions
// ========================================

function highlightMatch(content: string, start: number, end: number): React.ReactNode {
    const before = content.slice(0, start);
    const match = content.slice(start, end);
    const after = content.slice(end);

    return (
        <>
            <span>{before}</span>
            <span className="bg-[var(--color-warning-light)] text-[var(--color-primary-dark)] font-medium px-0.5 rounded">
                {match}
            </span>
            <span>{after}</span>
        </>
    );
}

function truncatePath(path: string, maxLength: number = 40): string {
    if (path.length <= maxLength) return path;
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    if (fileName.length >= maxLength) return '...' + fileName.slice(-maxLength + 3);

    let result = fileName;
    for (let i = parts.length - 2; i >= 0 && result.length < maxLength - 3; i--) {
        result = parts[i].slice(0, 1) + '/' + result;
    }
    return '...' + result;
}

// ========================================
// Components
// ========================================

/**
 * 搜索输入框组件
 */
const SearchInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    isLoading: boolean;
}> = ({ value, onChange, isLoading }) => (
    <div className="relative">
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search in files..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
        />
        <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
        </svg>
        {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="loading-spinner w-4 h-4" />
            </div>
        )}
    </div>
);

/**
 * 搜索结果项组件
 */
const SearchResultItem: React.FC<{
    result: SearchResult;
    onClick: () => void;
    isSelected: boolean;
}> = ({ result, onClick, isSelected }) => (
    <div
        onClick={onClick}
        className={`
            px-3 py-2 cursor-pointer border-l-2 transition-all duration-100
            ${
                isSelected
                    ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)]'
                    : 'bg-[var(--color-bg-secondary)] border-transparent hover:bg-[var(--color-bg-tertiary)]'
            }
        `}
    >
        {/* 文件路径和行号 */}
        <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate flex-1 mr-2">
                {truncatePath(result.filePath)}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">:{result.lineNumber}</span>
        </div>

        {/* 匹配内容 */}
        <div className="text-sm text-[var(--color-text-primary)] font-mono truncate">
            {highlightMatch(result.lineContent.trim(), result.matchStart, result.matchEnd)}
        </div>
    </div>
);

/**
 * 空状态组件
 */
const EmptyState: React.FC<{ hasQuery: boolean }> = ({ hasQuery }) => (
    <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
        <div className="text-3xl mb-3">{hasQuery ? '🔍' : '🔎'}</div>
        <p className="text-sm font-medium mb-1">{hasQuery ? 'No results found' : 'Search in files'}</p>
        <p className="text-xs">{hasQuery ? 'Try a different search term' : 'Enter a search term to find matches'}</p>
    </div>
);

/**
 * 错误状态组件
 */
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-8 text-[var(--color-error)]">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-sm font-medium mb-1">Search failed</p>
        <p className="text-xs">{message}</p>
    </div>
);

// ========================================
// Main Component
// ========================================

export const SearchPanel: React.FC<SearchPanelProps> = ({ rootPath, onResultClick }) => {
    const [state, setState] = useState<SearchState>({
        query: '',
        results: [],
        isSearching: false,
        error: null,
    });
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // 防抖搜索
    const searchFiles = useCallback(
        async (query: string) => {
            if (!query.trim()) {
                setState((prev) => ({ ...prev, results: [], isSearching: false, error: null }));
                return;
            }

            setState((prev) => ({ ...prev, isSearching: true, error: null }));

            try {
                const result = await apiClient.files.search.query({
                    query: query.trim(),
                    path: rootPath,
                    maxResults: 100,
                });

                setState((prev) => ({
                    ...prev,
                    results: result.results,
                    isSearching: false,
                    error: null,
                }));
                setSelectedIndex(-1);
            } catch (err: any) {
                setState((prev) => ({
                    ...prev,
                    results: [],
                    isSearching: false,
                    error: err.message || 'Search failed',
                }));
            }
        },
        [rootPath],
    );

    // 输入变化时防抖搜索
    const handleQueryChange = useCallback(
        (query: string) => {
            setState((prev) => ({ ...prev, query }));

            // 清除之前的定时器
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            // 设置新的防抖定时器
            debounceRef.current = setTimeout(() => {
                searchFiles(query);
            }, 300);
        },
        [searchFiles],
    );

    // 清理防抖定时器
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // 键盘导航
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!state.results.length) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, state.results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < state.results.length) {
                        onResultClick?.(state.results[selectedIndex]);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.results, selectedIndex, onResultClick]);

    // 滚动到选中项
    useEffect(() => {
        if (selectedIndex >= 0 && resultsContainerRef.current) {
            const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // 处理结果点击
    const handleResultClick = useCallback(
        (result: SearchResult) => {
            setSelectedIndex(state.results.indexOf(result));
            onResultClick?.(result);
        },
        [state.results, onResultClick],
    );

    return (
        <div className="search-panel h-full flex flex-col min-h-0">
            {/* 搜索输入框 */}
            <div className="p-3 border-b border-[var(--color-border-subtle)] flex-shrink-0">
                <SearchInput value={state.query} onChange={handleQueryChange} isLoading={state.isSearching} />
            </div>

            {/* 搜索结果 */}
            <div ref={resultsContainerRef} className="flex-1 min-h-0 overflow-y-auto">
                {state.error ? (
                    <ErrorState message={state.error} />
                ) : state.isSearching ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="loading-spinner w-5 h-5" />
                    </div>
                ) : state.results.length > 0 ? (
                    <div className="divide-y divide-[var(--color-border-subtle)]">
                        {/* 结果统计 */}
                        <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)]">
                            {state.results.length} result{state.results.length !== 1 ? 's' : ''} for "{state.query}"
                        </div>

                        {/* 结果列表 */}
                        {state.results.map((result, index) => (
                            <SearchResultItem
                                key={`${result.filePath}:${result.lineNumber}`}
                                result={result}
                                onClick={() => handleResultClick(result)}
                                isSelected={index === selectedIndex}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState hasQuery={!!state.query.trim()} />
                )}
            </div>
        </div>
    );
};

export default SearchPanel;
