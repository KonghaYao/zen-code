/**
 * Tree View Component
 *
 * Tree-based visualization of state machine structure
 */

import { useState, Children } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Circle,
    CheckCircle,
    XCircle,
    Play,
    GitBranch,
    Plus,
    Trash2,
    MoreHorizontal,
} from '../../../components/ui/Icons.js';

interface TreeViewProps {
    definition: any;
    selectedNode: string | null;
    onSelectNode: (nodeId: string) => void;
    isEditing: boolean;
}

export function TreeView({ definition, selectedNode, onSelectNode, isEditing }: TreeViewProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

    const toggleExpand = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    const states = definition?.states || {};
    const initialState = definition?.initial;

    return (
        <div className="font-mono text-sm">
            {/* Root node */}
            <TreeNode
                id="root"
                label={definition?.name || 'State Machine'}
                type="machine"
                level={0}
                isExpanded={expandedNodes.has('root')}
                isSelected={selectedNode === 'root'}
                onToggleExpand={() => toggleExpand('root')}
                onSelect={() => onSelectNode('root')}
                isEditing={isEditing}
            >
                {/* Initial state indicator */}
                {initialState && (
                    <div className="flex items-center gap-2 py-1 px-4 text-xs text-white/40">
                        <Play size={12} />
                        <span>Initial: </span>
                        <code className="text-blue-400">{initialState}</code>
                    </div>
                )}

                {/* States */}
                <div className="mt-1">
                    {Object.entries(states).map(([stateName, stateDef]) => (
                        <StateNode
                            key={stateName}
                            stateName={stateName}
                            stateDef={stateDef as any}
                            initialState={initialState}
                            level={1}
                            expandedNodes={expandedNodes}
                            selectedNode={selectedNode}
                            onToggleExpand={toggleExpand}
                            onSelectNode={onSelectNode}
                            isEditing={isEditing}
                        />
                    ))}
                </div>

                {/* Add state button */}
                {isEditing && (
                    <button className="flex items-center gap-2 mx-4 my-2 px-2 py-1 text-xs text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors">
                        <Plus size={12} />
                        Add State
                    </button>
                )}
            </TreeNode>
        </div>
    );
}

interface StateNodeProps {
    stateName: string;
    stateDef: any;
    initialState: string;
    level: number;
    expandedNodes: Set<string>;
    selectedNode: string | null;
    onToggleExpand: (nodeId: string) => void;
    onSelectNode: (nodeId: string) => void;
    isEditing: boolean;
}

function StateNode({
    stateName,
    stateDef,
    initialState,
    level,
    expandedNodes,
    selectedNode,
    onToggleExpand,
    onSelectNode,
    isEditing,
}: StateNodeProps) {
    const nodeId = `state-${stateName}`;
    const isExpanded = expandedNodes.has(nodeId);
    const isSelected = selectedNode === nodeId;
    const isInitial = stateName === initialState;
    const isFinal = stateDef?.type === 'final';
    const hasTransitions = stateDef?.on && Object.keys(stateDef.on).length > 0;
    const hasNestedStates = stateDef?.states && Object.keys(stateDef.states).length > 0;

    const stateIcon = isFinal ? (
        <XCircle size={14} className="text-red-600" />
    ) : isInitial ? (
        <Play size={14} className="text-green-600" />
    ) : (
        <Circle size={14} className="text-blue-600" />
    );

    return (
        <TreeNode
            id={nodeId}
            label={stateName}
            type="state"
            level={level}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggleExpand={() => onToggleExpand(nodeId)}
            onSelect={() => onSelectNode(nodeId)}
            icon={stateIcon}
            badge={isFinal ? 'final' : isInitial ? 'initial' : undefined}
            isEditing={isEditing}
        >
            {/* Transitions */}
            {hasTransitions && (
                <div className="border-l-2 border-gray-200 ml-3">
                    {Object.entries(stateDef.on).map(([eventName, transition]) => {
                        const transitionId = `transition-${stateName}-${eventName}`;
                        const target = (transition as any)?.target;
                        const transSelected = selectedNode === transitionId;

                        return (
                            <TreeNode
                                key={eventName}
                                id={transitionId}
                                label={`${eventName} → ${target}`}
                                type="transition"
                                level={level + 1}
                                isExpanded={false}
                                isSelected={transSelected}
                                onToggleExpand={() => {}}
                                onSelect={() => onSelectNode(transitionId)}
                                icon={<GitBranch size={12} className="text-yellow-600" />}
                                isEditing={isEditing}
                            />
                        );
                    })}
                </div>
            )}

            {/* Add transition button */}
            {isEditing && hasTransitions === false && (
                <button className="flex items-center gap-2 mx-4 my-1 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                    <Plus size={10} />
                    Add Transition
                </button>
            )}

            {/* Nested states */}
            {hasNestedStates && isExpanded && (
                <div className="border-l-2 border-gray-200 ml-3">
                    {Object.entries(stateDef.states).map(([nestedName, nestedDef]) => (
                        <StateNode
                            key={nestedName}
                            stateName={nestedName}
                            stateDef={nestedDef}
                            initialState={stateDef.initial || ''}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            selectedNode={selectedNode}
                            onToggleExpand={onToggleExpand}
                            onSelectNode={onSelectNode}
                            isEditing={isEditing}
                        />
                    ))}
                </div>
            )}
        </TreeNode>
    );
}

interface TreeNodeProps {
    id: string;
    label: string;
    type: 'machine' | 'state' | 'transition';
    level: number;
    isExpanded: boolean;
    isSelected: boolean;
    onToggleExpand: () => void;
    onSelect: () => void;
    icon?: React.ReactNode;
    badge?: string;
    isEditing: boolean;
    children?: React.ReactNode;
}

function TreeNode({
    id,
    label,
    type,
    level,
    isExpanded,
    isSelected,
    onToggleExpand,
    onSelect,
    icon,
    badge,
    isEditing,
    children,
}: TreeNodeProps) {
    const [showActions, setShowActions] = useState(false);
    const hasChildren = Children.count(children) > 0;
    const canExpand = hasChildren || type === 'state';

    const typeColors: Record<string, string> = {
        machine: 'text-purple-600',
        state: 'text-blue-600',
        transition: 'text-yellow-600',
    };

    return (
        <div className="select-none">
            <div
                className={`group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ paddingLeft: level * 16 + 8 }}
                onClick={onSelect}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Expand toggle */}
                {canExpand ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} className="text-gray-400" />
                        ) : (
                            <ChevronRight size={14} className="text-gray-400" />
                        )}
                    </button>
                ) : (
                    <span className="w-5" />
                )}

                {/* Icon */}
                {icon || <Circle size={14} className={typeColors[type]} />}

                {/* Label */}
                <span className="flex-1 truncate font-medium">{label}</span>

                {/* Badge */}
                {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase">
                        {badge}
                    </span>
                )}

                {/* Actions */}
                {isEditing && showActions && (
                    <div className="flex items-center gap-1">
                        {type === 'state' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Add transition
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                                title="Add transition"
                            >
                                <GitBranch size={12} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Delete
                            }}
                            className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Children */}
            {isExpanded && hasChildren && <div className="children">{children}</div>}
        </div>
    );
}

export default TreeView;
