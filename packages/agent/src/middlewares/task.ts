import { AgentMiddleware, WrapToolCallHook } from 'langchain';
import { todo_write_tool } from '../tools/task_tools';
export const taskMiddleware = {
    name: 'task',
    tools: [todo_write_tool as any],
} as AgentMiddleware;
