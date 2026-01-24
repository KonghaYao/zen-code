/**
 * ApprovalItem - 单个审批项组件
 *
 * 显示审批选择器、编辑器
 */

import React, { useState } from 'react';
import type { ApprovalRequest } from './types';
import { ApprovalStatus } from './types';

interface ApprovalItemProps {
    request: ApprovalRequest;
    allowedDecisions?: string[];
    onApprove: () => void;
    onEdit: (editedArgs: any) => void;
    onReject: (message: string) => void;
}

const ACTION_COLORS: { [key: string]: string } = {
    approve: 'green',
    reject: 'red',
    edit: 'yellow',
    modify: 'cyan',
};

const getActionColor = (action: string): string => {
    return ACTION_COLORS[action.toLowerCase()] || 'gray';
};

export const ApprovalItem: React.FC<ApprovalItemProps> = ({
    request,
    allowedDecisions = ['approve', 'edit', 'reject'],
    onApprove,
    onEdit,
    onReject,
}) => {
    const [selectState, setSelectState] = useState('approve');
    const [isEditing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const messageIndex = request.messageIndex;
    const description = request.description;

    const handleEditSubmit = () => {
        if (!editValue.trim()) return;

        if (selectState === 'edit') {
            try {
                const editedArgs = JSON.parse(editValue);
                onEdit(editedArgs);
            } catch (error) {
                console.error('Invalid JSON:', error);
                alert('无效的 JSON 格式');
                return;
            }
        } else {
            const message = `User rejected to run this tool, reason: ${editValue}`;
            onReject(message);
        }

        setEditing(false);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setEditing(false);
        setEditValue('');
    };

    const handleActionSelect = (item: string) => {
        console.log('[ApprovalItem] Action selected:', item);
        if (item === 'approve') {
            console.log('[ApprovalItem] Calling onApprove');
            onApprove();
            return;
        }

        setSelectState(item);
        setEditing(true);

        if (item === 'edit') {
            setEditValue(JSON.stringify(request.toolCall.args, null, 2));
        } else {
            setEditValue('');
        }
    };

    const actionButtons = allowedDecisions.map((decision) => ({
        label: decision,
        value: decision,
    }));

    const renderActionSelector = () => (
        <div className="space-y-3">
            <div>
                <div className="font-bold text-cyan-600 mb-1">{request.toolCall.name}</div>
                {messageIndex !== undefined && (
                    <div className="text-sm text-gray-500">
                        消息索引: {messageIndex}
                    </div>
                )}
                {description && (
                    <div className="text-sm text-gray-500">
                        {description}
                    </div>
                )}
            </div>

            <div className="flex gap-2 flex-wrap">
                {actionButtons.map((button) => {
                    const color = getActionColor(button.label);
                    const colorClasses = {
                        green: 'bg-green-500 hover:bg-green-600 text-white',
                        red: 'bg-red-500 hover:bg-red-600 text-white',
                        yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                        cyan: 'bg-cyan-500 hover:bg-cyan-600 text-white',
                        gray: 'bg-gray-500 hover:bg-gray-600 text-white',
                    };

                    return (
                        <button
                            key={button.value}
                            onClick={() => handleActionSelect(button.value)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${colorClasses[color as keyof typeof colorClasses]}`}
                        >
                            {button.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderEditUI = () => {
        const actionColor = getActionColor(selectState);
        const isEditMode = selectState === 'edit';

        return (
            <div className="space-y-3">
                <div>
                    <div className={`font-bold text-${actionColor}-600 mb-1`}>
                        {selectState.toUpperCase()} 模式 - {request.toolCall.name}
                    </div>
                    {messageIndex !== undefined && (
                        <div className="text-sm text-gray-500">
                            消息索引: {messageIndex}
                        </div>
                    )}
                    {description && (
                        <div className="text-sm text-gray-500">
                            {description}
                        </div>
                    )}
                </div>

                {isEditMode ? (
                    <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                            编辑工具参数 (JSON 格式):
                        </div>
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="输入 JSON..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={10}
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                            输入附加信息:
                        </div>
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="输入信息..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={3}
                            autoFocus
                        />
                    </div>
                )}

                <div className="text-sm text-gray-500">
                    <span className="font-medium">↵ Enter</span> 提交 |
                    <span className="font-medium text-red-500"> Esc</span> 取消
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleEditSubmit}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors bg-${actionColor}-500 hover:bg-${actionColor}-600 text-white`}
                    >
                        提交
                    </button>
                    <button
                        onClick={handleEditCancel}
                        className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-500 hover:bg-gray-600 text-white"
                    >
                        取消
                    </button>
                </div>
            </div>
        );
    };

    return isEditing ? renderEditUI() : renderActionSelector();
};
