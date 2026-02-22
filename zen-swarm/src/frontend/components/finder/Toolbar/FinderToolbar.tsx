/**
 * FinderToolbar - macOS 风格工具栏
 */

import React from 'react';
import type { FinderViewMode } from '../../../types/finder.js';

// ========================================
// Types
// ========================================

interface FinderToolbarProps {
    currentPath: string;
    viewMode: FinderViewMode;
    showHiddenFiles: boolean;
    loading: boolean;
    onNavigateBack: () => void;
    onNavigateForward: () => void;
    onNavigateUp: () => void;
    onNavigateHome: () => void;
    onViewModeChange: (mode: FinderViewMode) => void;
    onToggleHiddenFiles: () => void;
    onNewFolder: () => void;
    onNewFile: () => void;
}

// ========================================
// View Mode Icons
// ========================================

const ViewModeIcon: React.FC<{ mode: FinderViewMode; active: boolean; onClick: () => void }> = ({
    mode,
    active,
    onClick,
}) => {
    const icons: Record<FinderViewMode, React.ReactNode> = {
        icons: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
            </svg>
        ),
        list: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
            </svg>
        ),
        columns: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
            </svg>
        ),
        gallery: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
        ),
    };

    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded transition-colors ${
                active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
            title={mode.charAt(0).toUpperCase() + mode.slice(1) + ' View'}
        >
            {icons[mode]}
        </button>
    );
};

// ========================================
// Breadcrumb Component
// ========================================

interface BreadcrumbProps {
    path: string;
    onNavigate: (path: string) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <button
                    onClick={() => onNavigate('/')}
                    className="px-2 py-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] font-medium"
                >
                    🏠 Root
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
            <button
                onClick={() => onNavigate('/')}
                className="px-2 py-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] shrink-0"
            >
                🏠
            </button>
            {segments.map((segment, index) => {
                const segmentPath = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;

                return (
                    <React.Fragment key={segmentPath}>
                        <svg
                            className="w-3 h-3 text-[var(--color-text-muted)] shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <button
                            onClick={() => onNavigate(segmentPath)}
                            className={`px-2 py-1 rounded truncate max-w-[150px] ${
                                isLast
                                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                                    : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                            }`}
                            title={segment}
                        >
                            {segment}
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ========================================
// Main Component
// ========================================

export const FinderToolbar: React.FC<FinderToolbarProps> = ({
    currentPath,
    viewMode,
    showHiddenFiles,
    loading,
    onNavigateBack,
    onNavigateForward,
    onNavigateUp,
    onNavigateHome,
    onViewModeChange,
    onToggleHiddenFiles,
    onNewFolder,
    onNewFile,
}) => {
    const navigation = useFinderStore((s) => s.navigation);
    const setCurrentPath = useFinderStore((s) => s.setCurrentPath);

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
            {/* Left: Navigation + Breadcrumb */}
            <div className="flex items-center gap-3">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onNavigateBack}
                        disabled={!navigation.historyIndex || navigation.historyIndex <= 0}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Back"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={onNavigateForward}
                        disabled={!navigation.forwardHistory || navigation.forwardHistory.length === 0}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Forward"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={onNavigateUp}
                        disabled={currentPath === '/'}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Enclosing Folder"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>

                {/* Breadcrumb */}
                <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
            </div>

            {/* Right: View Options + Actions */}
            <div className="flex items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--color-bg-tertiary)]">
                    {(['icons', 'list', 'columns'] as FinderViewMode[]).map((mode) => (
                        <ViewModeIcon
                            key={mode}
                            mode={mode}
                            active={viewMode === mode}
                            onClick={() => onViewModeChange(mode)}
                        />
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-[var(--color-border-subtle)]" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onNewFolder}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="New Folder (⌘N)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={onNewFile}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="New File (⌘⇧N)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </button>

                    {/* Show Hidden Toggle */}
                    <button
                        onClick={onToggleHiddenFiles}
                        className={`p-1.5 rounded transition-colors ${
                            showHiddenFiles
                                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                        }`}
                        title={`${showHiddenFiles ? 'Hide' : 'Show'} Hidden Files`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

import { useFinderStore } from '../../../stores/finder.js';

export default FinderToolbar;
