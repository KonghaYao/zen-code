import { Box, Text, useFocusManager, useInput } from 'ink';
import { useState } from 'react';
import { MultiSelectPro } from '../../components/input/MultiSelect';
import { EnhancedTextInput } from '../../components/input/EnhancedTextInput';

// Color scheme for terminal actions
const ACTION_COLORS: { [key: string]: string } = {
    approve: 'green',
    reject: 'red',
    edit: 'yellow',
    modify: 'cyan',
    interrupt: 'magenta',
    retry: 'blue',
};

const getActionColor = (action: string): string => {
    return ACTION_COLORS[action.toLowerCase()] || 'white';
};

interface HumanApprovalProps {
    tool: any;
    onApprove?: () => void;
    onEdit?: (editedAction: any) => void;
    onReject?: (message: string) => void;
}

export const HumanApproval = ({ tool, onApprove, onEdit, onReject }: HumanApprovalProps) => {
    const interrupt = tool.getHumanInTheLoopData();
    const [selectState, setSelectState] = useState('approve');
    const [isEditing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const focusManager = useFocusManager();

    // Handle Esc key for canceling edit mode
    useInput((input, key) => {
        if (isEditing && key.escape) {
            handleEditCancel();
        }
    });

    const handleEditSubmit = () => {
        if (!editValue.trim()) return;

        if (selectState === 'edit') {
            const editedAction = {
                name: tool.message.name!,
                args: JSON.parse(editValue),
            };

            tool.sendResumeData({
                type: selectState,
                edited_action: editedAction,
            });

            onEdit?.(editedAction);
        } else {
            const message = 'User Reject to run this tool, reason: ' + editValue;

            tool.sendResumeData({
                type: selectState,
                message,
            });

            onReject?.(message);
        }

        setEditing(false);
        setEditValue('');
        focusManager.focus('global-input');
    };

    const handleEditCancel = () => {
        setEditing(false);
        setEditValue('');
        focusManager.focus('global-input');
    };

    const handleActionSelect = ([item]: string[]) => {
        if (item === 'approve') {
            tool.sendResumeData({
                type: item,
            });
            onApprove?.();
            return;
        }

        setSelectState(item);
        setEditing(true);

        if (item === 'edit') {
            setEditValue(JSON.stringify(tool.getInputRepaired(), null, 2));
        } else {
            setEditValue('');
            focusManager.focus('global-input');
        }
    };

    if (!interrupt?.reviewConfig) {
        return null;
    }

    const actionButtons = interrupt.reviewConfig.allowedDecisions.map((decision: string) => ({
        label: decision,
        value: decision,
    }));

    const renderActionSelector = () => (
        <Box flexDirection="column" paddingX={1}>
            <Text color="cyan" bold>
                Terminal Action Required
            </Text>
            <Box>
                <MultiSelectPro
                    singleSelect
                    options={actionButtons}
                    onSubmit={handleActionSelect}
                    autoFocus={!isEditing}
                />
            </Box>
        </Box>
    );

    const renderEditUI = () => {
        const actionColor = getActionColor(selectState);
        const isEditMode = selectState === 'edit';

        return (
            <Box flexDirection="column" paddingX={1} marginTop={0}>
                <Box>
                    <Text color={actionColor} bold>
                        {selectState.toUpperCase()} MODE
                    </Text>
                    <Text color="gray"> - Press Enter to submit, Esc to cancel</Text>
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
                        <Box paddingX={1}>
                            <EnhancedTextInput
                                value={editValue}
                                onChange={setEditValue}
                                onSubmit={handleEditSubmit}
                                placeholder="Enter message..."
                                autoFocus={false}
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
