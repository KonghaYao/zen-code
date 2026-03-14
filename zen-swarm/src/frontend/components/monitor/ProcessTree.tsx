/**
 * 进程树组件
 */

import type { ProcessTreeNode } from './types.js';
import { useState } from 'react';
import { IconButton } from '../ui/IconButton.js';

interface ProcessTreeProps {
    tree: ProcessTreeNode | null;
    isLoading?: boolean;
}

export function ProcessTree({ tree, isLoading }: ProcessTreeProps) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const toggleExpand = (pid: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(pid)) {
                next.delete(pid);
            } else {
                next.add(pid);
            }
            return next;
        });
    };

    return (
        <div className="bg-white border-t border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">进程树</h3>
                {isLoading && <span className="text-xs text-text-muted">加载中...</span>}
            </div>

            <div className="h-64 overflow-y-auto">
                {tree ? (
                    <TreeNode node={tree} expanded={expanded} onToggle={toggleExpand} level={0} />
                ) : (
                    <p className="text-text-muted">没有进程树数据</p>
                )}
            </div>
        </div>
    );
}

interface TreeNodeProps {
    node: ProcessTreeNode;
    expanded: Set<number>;
    onToggle: (pid: number) => void;
    level: number;
}

function TreeNode({ node, expanded, onToggle, level }: TreeNodeProps) {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.pid);

    return (
        <div>
            <div
                className="flex items-center gap-2 py-1 hover:bg-bg-tertiary rounded px-1"
                style={{ paddingLeft: `${level * 16 + 4}px` }}
            >
                {hasChildren && (
                    <IconButton onClick={() => onToggle(node.pid)} className="w-4 h-4 text-xs">
                        {isExpanded ? '▼' : '▶'}
                    </IconButton>
                )}
                <span className="flex-1 text-sm text-text-primary">
                    <span className="font-mono text-text-muted mr-2">{node.pid}</span>
                    {node.name}
                </span>
                <span className="text-xs text-text-muted">{node.cpuPercent.toFixed(1)}% CPU</span>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.pid}
                            node={child}
                            expanded={expanded}
                            onToggle={onToggle}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
