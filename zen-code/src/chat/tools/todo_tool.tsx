import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { todoWriteSchema } from '@codegraph/agent/src/tools/task_tools/todo_tool';

interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
}

interface TodoWriteInput {
    todos: TodoItem[];
}

const STATUS_COLORS = {
    pending: 'gray',
    in_progress: 'yellow',
    completed: 'green',
};

const STATUS_SYMBOLS = {
    pending: '○',
    in_progress: '◐',
    completed: '✓',
};

export const todo_tool = createUITool({
    name: 'todo_write',
    description: 'Use this tool to create and manage a structured task list',
    parameters: todoWriteSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired() as TodoWriteInput;
        // Validate input
        if (!input || !input.todos || !Array.isArray(input.todos)) {
            return (
                <Box flexDirection="column" borderStyle="round" borderColor="red">
                    <Text color="red">Error: Invalid todo data structure</Text>
                </Box>
            );
        }

        const todos = input.todos;
        // Render todo list
        const renderTodoList = () => {
            if (todos.length === 0) {
                return (
                    <Box paddingX={1}>
                        <Text color="gray">No tasks in todo list</Text>
                    </Box>
                );
            }

            return (
                <Box flexDirection="column" marginTop={0}>
                    {todos.map((todo, index) => (
                        <Box key={todo.id} paddingX={1} paddingY={0}>
                            <Text color={STATUS_COLORS[todo.status]} bold>
                                {STATUS_SYMBOLS[todo.status]}{' '}
                            </Text>
                            <Text color={todo.status === 'in_progress' ? 'white' : 'gray'}>
                                {index + 1}. {todo.content}
                            </Text>
                        </Box>
                    ))}
                </Box>
            );
        };

        // Main render
        return (
            <Box flexDirection="column" paddingY={1}>
                {/* Todo List */}
                <Box flexDirection="column" marginTop={0}>
                    {renderTodoList()}
                </Box>
            </Box>
        );
    },
});
