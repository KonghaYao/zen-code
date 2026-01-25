import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TaskStoreManager } from '@codegraph/config';
import { TaskStatus, AgentType } from '@codegraph/config';
import { getThreadId } from '@langgraph-js/pro';

/**
 * Commit Task Tool
 *
 * Allows agents to update task status and properties.
 * Uses TaskStoreManager from @codegraph/config for persistence.
 *
 * Common use cases:
 * - Mark task as 'running' when starting work
 * - Mark task as 'complete' when finished
 * - Mark task as 'error' if failed
 * - Update task description or error details
 */
export const commit_task_tool = tool(
    async (input, runtime) => {
        try {

            // Get project root from environment or use current directory
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();

            // Initialize TaskStoreManager
            const storeManager = new TaskStoreManager(projectRoot);
            await storeManager.initialize();

            // Check if task exists
            const existingTask = await storeManager.getTask(input.taskId);
            if (!existingTask) {
                return `Error: Task with ID "${input.taskId}" not found.`;
            }

            // Build updates object
            const updates: any = {};

            if (input.status) {
                updates.status = input.status;
            }

            if (input.assignedTo) {
                updates.assignedTo = input.assignedTo;
            }
            const threadId = getThreadId(runtime)
            if (threadId) {
                updates.threadId = threadId;
            }

            if (input.description) {
                updates.description = input.description;
            }

            if (input.error) {
                updates.error = input.error;
            }

            if (input.output) {
                updates.output = input.output;
            }

            // Update task
            const success = await storeManager.updateTask(input.taskId, updates);

            if (!success) {
                return `Error: Failed to update task "${input.taskId}".`;
            }

            // Get updated task for confirmation
            const updatedTask = await storeManager.getTask(input.taskId);

            return `Task "${updatedTask?.title}" (ID: ${input.taskId}) updated successfully.
- Status: ${updatedTask?.status}
${updates.assignedTo ? `- Assigned to: ${updates.assignedTo}` : ''}
${updates.threadId ? `- Thread ID: ${updates.threadId}` : ''}
${updates.error ? `- Error: ${updates.error.message || 'Error recorded'}` : ''}`;
        } catch (error) {
            return `Error updating task: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: 'commit_task',
        description: `Update task status and properties in the Task System.

**When to use**:
- Mark task as 'running' when you start working on it
- Mark task as 'complete' when you successfully finish it
- Mark task as 'error' if it fails with an error
- Mark task as 'review' when it needs human approval
- Mark task as 'feedback' when you're stuck and need human input
- Update task description, error details, or output

**Task Status Values**:
- 'pickup' - Task is ready to be picked up (initial state)
- 'running' - Agent is currently working on this task
- 'complete' - Task successfully completed
- 'error' - Task failed with an error
- 'review' - Task is complete, waiting for human review
- 'feedback' - Task is blocked, waiting for human input

**Important Notes**:
- When status changes to 'running', startedAt is automatically set
- When status changes to 'complete'/'error'/'review', completedAt is automatically set
- You can update multiple fields in one call
- Use this tool IMMEDIATELY after starting or finishing a task
- Don't batch task updates - update status in real-time as you work`,
        schema: z.object({
            taskId: z.string().describe('Task ID to update'),
            status: z.enum(['pickup', 'running', 'complete', 'error', 'review', 'feedback']).optional().describe('New task status'),
            assignedTo: z.enum(['default', 'planner', 'reviewer', 'refactor', 'finder', 'debugger']).optional().describe('Agent assigned to this task'),
            description: z.string().optional().describe('Updated task description'),
            error: z.object({
                message: z.string().describe('Error message'),
                stack: z.string().optional().describe('Error stack trace'),
                retryCount: z.number().optional().describe('Number of retries attempted'),
            }).optional().describe('Error details if task failed'),
            output: z.string().optional().describe('Task output or result'),
        }),
    }
);
