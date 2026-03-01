/**
 * FinderToolbar - macOS 风格工具栏
 */

import React from 'react';
import type { FinderViewMode } from '../../../types/finder.js';
import {
    LayoutGrid,
    List,
    Columns,
    Gallery,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Home,
    FolderOpen,
    File,
    Eye,
    EyeOff,
    FilePlus,
} from '../../ui/Icons.js';

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
        icons: <LayoutGrid className="w-4 h-4" />,
        list: <List className="w-4 h-4" />,
        columns: <Columns className="w-4 h-4" />,
        gallery: <ImageIcon className="w-4 h-4" />,
    };

    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded transition-colors ${
                active ? 'bg-primary text-white' : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
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
                    className="px-2 py-1 rounded hover:bg-bg-tertiary text-text-primary font-medium"
                >
                    <Home className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
            <button
                onClick={() => onNavigate('/')}
                className="px-2 py-1 rounded hover:bg-bg-tertiary text-text-secondary shrink-0"
            >
                <Home className="w-4 h-4" />
            </button>
            {segments.map((segment, index) => {
                const segmentPath = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;

                return (
                    <React.Fragment key={segmentPath}>
                        <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                        <button
                            onClick={() => onNavigate(segmentPath)}
                            className={`px-2 py-1 rounded truncate max-w-[150px] ${
                                isLast
                                    ? 'bg-primary-light text-primary font-medium'
                                    : 'hover:bg-bg-tertiary text-text-secondary'
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
        <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border-subtle">
            {/* Left: Navigation + Breadcrumb */}
            <div className="flex items-center gap-3">
                {/* Navigation Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onNavigateBack}
                        disabled={!navigation.historyIndex || navigation.historyIndex <= 0}
                        className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Back"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNavigateForward}
                        disabled={!navigation.forwardHistory || navigation.forwardHistory.length === 0}
                        className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Forward"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNavigateUp}
                        disabled={currentPath === '/'}
                        className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Enclosing Folder"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                </div>

                {/* Breadcrumb */}
                <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
            </div>

            {/* Right: View Options + Actions */}
            <div className="flex items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-tertiary">
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
                <div className="w-px h-6 bg-border-subtle" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onNewFolder}
                        className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                        title="New Folder (⌘N)"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onNewFile}
                        className="p-1.5 rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                        title="New File (⌘⇧N)"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>

                    {/* Show Hidden Toggle */}
                    <button
                        onClick={onToggleHiddenFiles}
                        className={`p-1.5 rounded transition-colors ${
                            showHiddenFiles
                                ? 'bg-primary-light text-primary'
                                : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
                        }`}
                        title={`${showHiddenFiles ? 'Hide' : 'Show'} Hidden Files`}
                    >
                        {showHiddenFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

import { useFinderStore } from '../../../stores/finder.js';
import { ImageIcon } from 'lucide-react';

export default FinderToolbar;
