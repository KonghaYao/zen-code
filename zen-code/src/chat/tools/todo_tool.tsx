import { createUITool, ToolManager } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { z } from 'zod';

const todoSchema = z.object({
    content: z.string().min(1),
    status: z.enum(['pending', 'in_progress', 'completed']),
    id: z.string(),
});

const todoWriteSchema = z.object({
    todos: z.array(todoSchema).describe('The updated todo list'),
});

type TodoStatus = 'pending' | 'in_progress' | 'completed';

interface TodoItem {
    id: string;
    content: string;
    status: TodoStatus;
}

const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed'];

const STATUS_COLORS: Record<TodoStatus, string> = {
    pending: 'gray',
    in_progress: 'yellow',
    completed: 'green',
};

const STATUS_SYMBOLS: Record<TodoStatus, string> = {
    pending: '○',
    in_progress: '◐',
    completed: '✓',
};

/**
 * 将任意值规范化为合法的 TodoItem，防御流式阶段字段缺失或类型错误
 */
function normalizeTodo(raw: unknown, index: number): TodoItem {
    const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const id = typeof obj.id === 'string' ? obj.id : String(index);
    const content = typeof obj.content === 'string' ? obj.content : String(obj.content ?? '');
    const status: TodoStatus = VALID_STATUSES.includes(obj.status as TodoStatus)
        ? (obj.status as TodoStatus)
        : 'pending';
    return { id, content, status };
}

export const todo_tool = createUITool({
    name: 'todo_write',
    description: 'Use this tool to create and manage a structured task list',
    parameters: todoWriteSchema.shape,
    handler: ToolManager.waitForUIDone,
    render(tool) {
        const input = tool.getInputRepaired();

        // 防御：input 本身或 todos 可能是 undefined / 非数组（流式阶段对象逐步构建）
        const rawTodos = input && Array.isArray(input.todos) ? input.todos : [];
        const todos: TodoItem[] = rawTodos.map(normalizeTodo);

        if (!input) {
            return (
                <Box flexDirection="column" borderStyle="round" borderColor="red">
                    <Text color="red">Error: Invalid todo data structure</Text>
                </Box>
            );
        }

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
