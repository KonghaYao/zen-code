/**
 * FinderToolbar - macOS 风格工具栏（重设计）
 */

import React from 'react';
import type { FinderViewMode } from '../../../types/finder.js';
import {
    LayoutGrid,
    List,
    Columns,
    ChevronLeft,
    ChevronRight,
    Home,
    FolderOpen,
    FilePlus,
    Eye,
    EyeOff,
} from '../../ui/Icons.js';
import { useFinderStore } from '../../../stores/finder.js';
import { PanelLeftOpen } from 'lucide-react';

// ========================================
// Types
// ========================================

interface FinderToolbarProps {
    currentPath: string;
    viewMode: FinderViewMode;
    showHiddenFiles: boolean;
    loading: boolean;
    sidebarCollapsed: boolean;
    onNavigateBack: () => void;
    onNavigateForward: () => void;
    onNavigateUp: () => void;
    onNavigateHome: () => void;
    onViewModeChange: (mode: FinderViewMode) => void;
    onToggleHiddenFiles: () => void;
    onNewFolder: () => void;
    onNewFile: () => void;
    onToggleSidebar: () => void;
}

// ========================================
// View Mode Segmented Control
// ========================================

const ViewModeButton: React.FC<{ mode: FinderViewMode; active: boolean; onClick: () => void }> = ({
    mode,
    active,
    onClick,
}) => {
    const icons: Record<string, React.ReactNode> = {
        icons: <LayoutGrid style={{ width: 14, height: 14 }} />,
        list: <List style={{ width: 14, height: 14 }} />,
        columns: <Columns style={{ width: 14, height: 14 }} />,
    };

    return (
        <button
            onClick={onClick}
            title={mode.charAt(0).toUpperCase() + mode.slice(1) + ' View'}
            className={`flex items-center justify-center py-[3px] px-[7px] rounded-[5px] border-none cursor-pointer transition-all duration-[0.12s] ease-out min-h-[unset] ${
                active
                    ? 'bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.2)] text-black/85'
                    : 'bg-transparent text-[rgba(60,60,67,0.65)] hover:bg-black/[0.06]'
            }`}
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
            <div className="flex items-center gap-0.5">
                <button
                    onClick={() => onNavigate('/')}
                    className="flex items-center py-[2px] px-[6px] rounded-[4px] border-none cursor-pointer bg-transparent text-black/85 font-medium text-[13px] tracking-[-0.01em] min-h-[unset] hover:bg-black/[0.06]"
                >
                    <Home style={{ width: 14, height: 14 }} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0.5 overflow-x-auto">
            <button
                onClick={() => onNavigate('/')}
                className="flex items-center shrink-0 py-[2px] px-[6px] rounded-[4px] border-none cursor-pointer bg-transparent text-[rgba(60,60,67,0.65)] text-[13px] tracking-[-0.01em] min-h-[unset] hover:bg-black/[0.06]"
            >
                <Home style={{ width: 13, height: 13 }} />
            </button>
            {segments.map((segment, index) => {
                const segmentPath = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;

                return (
                    <React.Fragment key={segmentPath}>
                        <ChevronRight
                            className="shrink-0 text-[rgba(60,60,67,0.35)]"
                            style={{ width: 12, height: 12 }}
                        />
                        <button
                            onClick={() => onNavigate(segmentPath)}
                            title={segment}
                            className={`py-[2px] px-[6px] rounded-[4px] border-none cursor-pointer bg-transparent text-[13px] tracking-[-0.01em] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap min-h-[unset] ${
                                isLast
                                    ? 'text-black/85 font-medium'
                                    : 'text-[rgba(60,60,67,0.65)] font-normal hover:bg-black/[0.06]'
                            }`}
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
    sidebarCollapsed,
    onNavigateBack,
    onNavigateForward,
    onViewModeChange,
    onToggleHiddenFiles,
    onNewFolder,
    onNewFile,
    onToggleSidebar,
}) => {
    const navigation = useFinderStore((s) => s.navigation);
    const setCurrentPath = useFinderStore((s) => s.setCurrentPath);

    const canGoBack = !!(navigation.historyIndex && navigation.historyIndex > 0);
    const canGoForward = !!(navigation.forwardHistory && navigation.forwardHistory.length > 0);

    return (
        <div
            className="flex items-center justify-between px-3 min-h-[40px] bg-[rgba(246,246,246,0.9)] border-b border-b-[rgba(0,0,0,0.12)]"
            style={{
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: '0.5px solid rgba(0, 0, 0, 0.12)',
            }}
        >
            {/* Left: Sidebar toggle + Navigation + Breadcrumb */}
            <div className="flex items-center gap-2">
                {/* Sidebar toggle (shown when collapsed) */}
                {sidebarCollapsed && (
                    <button
                        onClick={onToggleSidebar}
                        title="Show Sidebar"
                        className="flex items-center p-1 rounded-[5px] border-none cursor-pointer bg-transparent text-[rgba(60,60,67,0.65)] min-h-[unset] hover:bg-black/[0.06]"
                    >
                        <PanelLeftOpen style={{ width: 15, height: 15 }} />
                    </button>
                )}

                {/* Back/Forward Pill */}
                <div className="flex items-center overflow-hidden rounded-[7px] bg-black/[0.07]">
                    <button
                        onClick={onNavigateBack}
                        disabled={!canGoBack}
                        title="Back"
                        className={`flex items-center py-[3px] px-[7px] border-none bg-transparent min-h-[unset] ${
                            canGoBack ? 'cursor-pointer text-black/75' : 'cursor-not-allowed text-black/20'
                        }`}
                    >
                        <ChevronLeft style={{ width: 15, height: 15 }} />
                    </button>
                    <div className="w-px h-3.5 bg-black/[0.12]" />
                    <button
                        onClick={onNavigateForward}
                        disabled={!canGoForward}
                        title="Forward"
                        className={`flex items-center py-[3px] px-[7px] border-none bg-transparent min-h-[unset] ${
                            canGoForward ? 'cursor-pointer text-black/75' : 'cursor-not-allowed text-black/20'
                        }`}
                    >
                        <ChevronRight style={{ width: 15, height: 15 }} />
                    </button>
                </div>

                {/* Breadcrumb */}
                <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
            </div>

            {/* Right: View Mode + Actions */}
            <div className="flex items-center gap-2">
                {/* View Mode Segmented Control */}
                <div className="flex items-center p-[2px] rounded-[8px] bg-black/[0.07]">
                    {(['icons', 'list', 'columns'] as FinderViewMode[]).map((mode) => (
                        <ViewModeButton
                            key={mode}
                            mode={mode}
                            active={viewMode === mode}
                            onClick={() => onViewModeChange(mode)}
                        />
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-black/10" />

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={onNewFolder}
                        title="New Folder (⌘N)"
                        className="flex items-center p-1 rounded-[5px] border-none cursor-pointer bg-transparent text-[rgba(60,60,67,0.65)] min-h-[unset] hover:bg-black/[0.06]"
                    >
                        <FolderOpen style={{ width: 15, height: 15 }} />
                    </button>
                    <button
                        onClick={onNewFile}
                        title="New File (⌘⇧N)"
                        className="flex items-center p-1 rounded-[5px] border-none cursor-pointer bg-transparent text-[rgba(60,60,67,0.65)] min-h-[unset] hover:bg-black/[0.06]"
                    >
                        <FilePlus style={{ width: 15, height: 15 }} />
                    </button>
                    <button
                        onClick={onToggleHiddenFiles}
                        title={`${showHiddenFiles ? 'Hide' : 'Show'} Hidden Files`}
                        className={`flex items-center p-1 rounded-[5px] border-none cursor-pointer min-h-[unset] ${
                            showHiddenFiles
                                ? 'bg-[rgba(0,98,255,0.12)] text-[rgba(0,98,255,0.85)]'
                                : 'bg-transparent text-[rgba(60,60,67,0.65)] hover:bg-black/[0.06]'
                        }`}
                    >
                        {showHiddenFiles ? (
                            <Eye style={{ width: 15, height: 15 }} />
                        ) : (
                            <EyeOff style={{ width: 15, height: 15 }} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinderToolbar;
