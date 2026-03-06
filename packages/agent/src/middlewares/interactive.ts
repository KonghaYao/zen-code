import { AgentMiddleware, WrapToolCallHook } from 'langchain';
import { ask_user_questions_tool } from '../tools/ask_user_questions';
export const InteractiveMiddleware = {
    name: 'interactive',
    tools: [ask_user_questions_tool as any],
} as AgentMiddleware;
