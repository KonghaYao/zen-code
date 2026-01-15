import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text, useFocusManager, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { InputPreviewer } from '../components/MessageTool';
import { MultiSelectPro } from '../components/input/MultiSelect';
import { EnhancedTextInput } from '../components/input/EnhancedTextInput';

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

export const terminal = createUITool({
    name: 'terminal',
    description: '',
    parameters: {},
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const interrupt = tool.getHumanInTheLoopData();
        const [selectState, setSelectState] = useState('approve');
        const [isEditing, setEditing] = useState(false);
        const [editValue, setEditValue] = useState('');

        const actionButtons = () => {
            if (!interrupt?.reviewConfig) return null;
            const buttons = interrupt.reviewConfig.allowedDecisions.map((i) => {
                return {
                    label: i,
                    value: i,
                };
            });

            return (
                <Box flexDirection="column" paddingX={1}>
                    <Text color="cyan" bold>
                        Terminal Action Required
                    </Text>
                    <Box>
                        <MultiSelectPro
                            singleSelect
                            options={buttons}
                            onSubmit={([item]) => {
                                if (item === 'approve') {
                                    tool.sendResumeData({
                                        type: item,
                                    });
                                    return;
                                }
                                setSelectState(item);
                                setEditing(true);
                                if (item === 'edit') {
                                    setEditValue(JSON.stringify(tool.getInputRepaired(), null, 2));
                                    // 编辑状态不用聚焦，edit 面板有一个输入框
                                } else {
                                    setEditValue('');
                                    focusManager.focus('global-input');
                                }
                            }}
                            autoFocus
                        />
                    </Box>
                </Box>
            );
        };
        const focusManager = useFocusManager();

        // MODIFIED: Add Esc key handler for canceling edit mode
        useInput((input, key) => {
            if (isEditing && key.escape) {
                handleEditCancel();
            }
        });

        const handleEditSubmit = () => {
            if (editValue.trim()) {
                if (selectState === 'edit') {
                    tool.sendResumeData({
                        type: selectState as any,
                        edited_action: {
                            name: tool.message.name!,
                            args: JSON.parse(editValue),
                        },
                    });
                    setEditing(false);
                    setEditValue('');
                } else {
                    tool.sendResumeData({
                        type: selectState as any,
                        message: 'User Reject to run this tool, reason: ' + editValue,
                    });
                    setEditing(false);
                    setEditValue('');
                }
            }
            focusManager.focus('global-input');
        };

        const handleEditCancel = () => {
            setEditing(false);
            setEditValue('');
            focusManager.focus('global-input');
        };

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

        const renderOutput = () => {
            if (!tool.output) return null;

            // Show only the last 10 lines of output
            const lines = tool.output.split('\n');
            const omittedCount = Math.max(0, lines.length - 10);
            const last10Lines = lines.slice(-10).join('\n');

            return (
                <Box flexDirection="column">
                    <Box borderStyle="single" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
                        {omittedCount > 0 && (
                            <Text color="gray" dimColor>
                                ... {omittedCount} lines omitted ...
                            </Text>
                        )}
                        <Text>{last10Lines}</Text>
                    </Box>
                </Box>
            );
        };

        return (
            <Box flexDirection="column">
                <Box paddingX={1}>
                    <InputPreviewer content={tool.getInputRepaired()}></InputPreviewer>
                </Box>
                {/* Main Content */}
                {isEditing ? renderEditUI() : actionButtons()}
                {/* Output */}
                {renderOutput()}
            </Box>
        );
    },
});
