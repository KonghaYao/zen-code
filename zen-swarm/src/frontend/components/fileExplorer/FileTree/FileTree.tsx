/**
 * FileTree 组件 - VSCode 风格的文件树
 *
 * 功能：
 * - 多级目录展开/折叠
 * - 仅显示文件名
 * - 单击选中
 * - 虚拟滚动（处理大型目录）
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FileIcon } from '../FileIcon.js';
import { ChevronRight } from '../../ui/Icons.js';

// ========================================
// Types
// ========================================

export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    extension?: string;
    icon: string;
    size?: number;
    children?: TreeNode[];
}

interface FileTreeProps {
    tree: TreeNode[];
    selectedPath: string | null;
    expandedPaths: Set<string>;
    onSelect: (node: TreeNode) => void;
    onToggleExpand: (path: string) => void;
    loading?: boolean;
}

// ========================================
// TreeNodeItem 组件
// ========================================

interface TreeNodeItemProps {
    node: TreeNode;
    depth: number;
    selectedPath: string | null;
    expandedPaths: Set<string>;
    onSelect: (node: TreeNode) => void;
    onToggleExpand: (path: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
    node,
    depth,
    selectedPath,
    expandedPaths,
    onSelect,
    onToggleExpand,
}) => {
    const isDirectory = node.type === 'directory';
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(node);
        },
        [node, onSelect],
    );

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isDirectory) {
                onToggleExpand(node.path);
            }
        },
        [node.path, isDirectory, onToggleExpand],
    );

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isDirectory) {
                onToggleExpand(node.path);
            }
        },
        [node.path, isDirectory, onToggleExpand],
    );

    return (
        <div className="file-tree-node">
            {/* 节点行 */}
            <div
                className={`
                    flex items-center gap-1 px-2 py-1 cursor-pointer
                    hover:bg-[var(--color-bg-secondary)] transition-colors duration-100
                    ${isSelected ? 'bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-light)]' : ''}
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
            >
                {/* 展开/折叠箭头 */}
                {isDirectory ? (
                    <button
                        onClick={handleToggle}
                        className="w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-transform duration-150"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                ) : (
                    <span className="w-4 h-4" />
                )}

                {/* 文件图标 */}
                <FileIcon icon={node.icon} extension={node.extension} isDirectory={isDirectory} size="sm" />

                {/* 文件名 */}
                <span className="truncate text-sm text-[var(--color-text-primary)]">{node.name}</span>
            </div>

            {/* 子节点（仅目录且展开时显示） */}
            {isDirectory && isExpanded && node.children && (
                <div className="file-tree-children">
                    {node.children.map((child) => (
                        <TreeNodeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            selectedPath={selectedPath}
                            expandedPaths={expandedPaths}
                            onSelect={onSelect}
                            onToggleExpand={onToggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ========================================
// FileTree 主组件
// ========================================

export const FileTree: React.FC<FileTreeProps> = ({
    tree,
    selectedPath,
    expandedPaths,
    onSelect,
    onToggleExpand,
    loading,
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
        );
    }

    if (tree.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
                <span className="text-2xl mb-2">📂</span>
                <p className="text-sm">Empty folder</p>
            </div>
        );
    }

    return (
        <div className="file-tree h-full overflow-y-auto">
            {tree.map((node) => (
                <TreeNodeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedPath}
                    expandedPaths={expandedPaths}
                    onSelect={onSelect}
                    onToggleExpand={onToggleExpand}
                />
            ))}
        </div>
    );
};

export default FileTree;
