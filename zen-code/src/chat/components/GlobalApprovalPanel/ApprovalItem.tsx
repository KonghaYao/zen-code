import { Box, Text, useFocusManager, useInput } from 'ink';
import { useState } from 'react';
import { MultiSelectPro } from 'ink-pro';
import { EnhancedTextInput } from '../input/EnhancedTextInput';
import { ApprovalRequest, ApprovalStatus } from '@codegraph/union-client';

/**
 * Color scheme for approval actions
 */
const ACTION_COLORS: { [key: string]: string } = {
    approve: 'green',
    reject: 'red',
    edit: 'yellow',
    modify: 'cyan',
};

const getActionColor = (action: string): string => {
    return ACTION_COLORS[action.toLowerCase()] || 'white';
};

interface ApprovalItemProps {
    request: ApprovalRequest;
    allowedDecisions?: string[];
    onApprove: () => void;
    onEdit: (editedArgs: any) => void;
    onReject: (message: string) => void;
    autoFocus?: boolean;
}

/**
 * 审批项组件（用于全局审批面板的单个 Tab）
 *
 * 显示审批选择器、编辑器，但不直接调用 tool.sendResumeData
 * 而是通过回调更新队列状态
 */
export const ApprovalItem = ({
    request,
    allowedDecisions = ['approve', 'edit', 'reject'],
    onApprove,
    onEdit,
    onReject,
    autoFocus = true,
}: ApprovalItemProps) => {
    const [selectState, setSelectState] = useState('approve');
    const [isEditing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    // 从 request 中获取附加信息
    const messageIndex = request.messageIndex;
    const description = request.description;

    // Handle Esc key for canceling edit mode
    useInput(
        (input, key) => {
            if (isEditing && key.escape) {
                handleEditCancel();
            }
        },
        { isActive: isEditing },
    );

    const handleEditSubmit = () => {
        if (!editValue.trim()) return;

        if (selectState === 'edit') {
            try {
                const editedArgs = JSON.parse(editValue);
                onEdit(editedArgs);
            } catch (error) {
                console.error('Invalid JSON:', error);
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

    const handleActionSelect = ([item]: string[]) => {
        if (item === 'approve') {
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
        <Box flexDirection="column" paddingX={1}>
            <Box flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>
                    {request.toolCall.name}
                </Text>
                {messageIndex !== undefined && (
                    <Text color="gray" dimColor>
                        Message Index: {messageIndex}
                    </Text>
                )}
                {description && (
                    <Text color="gray" dimColor>
                        Description: {description}
                    </Text>
                )}
            </Box>
            <Box>
                <MultiSelectPro
                    singleSelect
                    options={actionButtons}
                    onSubmit={handleActionSelect}
                    autoFocus={autoFocus}
                />
            </Box>
        </Box>
    );

    const renderEditUI = () => {
        const actionColor = getActionColor(selectState);
        const isEditMode = selectState === 'edit';

        return (
            <Box flexDirection="column" paddingX={1} marginTop={0}>
                <Box flexDirection="column" marginBottom={1}>
                    <Text color={actionColor} bold>
                        {selectState.toUpperCase()} MODE - {request.toolCall.name}
                    </Text>
                    {messageIndex !== undefined && (
                        <Text color="gray" dimColor>
                            Message Index: {messageIndex}
                        </Text>
                    )}
                    {description && (
                        <Text color="gray" dimColor>
                            Description: {description}
                        </Text>
                    )}
                </Box>

                {isEditMode ? (
                    <Box flexDirection="column" marginTop={0}>
                        <Text color="yellow" dimColor>
                            Editing action arguments (JSON format):
                        </Text>
                        <Box paddingX={1}>
                            <EnhancedTextInput
                                value={editValue}
                                onChange={setEditValue}
                                onSubmit={handleEditSubmit}
                                placeholder="Enter JSON..."
                                autoFocus
                            />
                        </Box>
                    </Box>
                ) : (
                    <Box flexDirection="column" marginTop={0}>
                        <Text color="cyan" dimColor>
                            Enter additional message for this action:
                        </Text>
                        <Box padding={1}>
                            <EnhancedTextInput
                                value={editValue}
                                onChange={setEditValue}
                                onSubmit={handleEditSubmit}
                                placeholder="Enter message..."
                                autoFocus={true}
                            />
                        </Box>
                    </Box>
                )}

                <Box marginTop={0}>
                    <Text color="gray">
                        <Text color={actionColor} bold>
                            ↵
                        </Text>{' '}
                        Submit |
                        <Text color="red" bold>
                            {' '}
                            Esc
                        </Text>{' '}
                        Cancel
                    </Text>
                </Box>
            </Box>
        );
    };

    return isEditing ? renderEditUI() : renderActionSelector();
};
