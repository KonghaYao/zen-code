import { tool } from '@langchain/core/tools';
import { TaskStoreManager, TaskNode, TaskNodeSchema } from '@codegraph/config';


/**
 * Add Task Tool
 *
 * Allows agents to add tasks to the Task System.
 * Uses TaskStoreManager from @codegraph/config for persistence.
 *
 */
export const add_task_tool = tool(
    async (input) => {
        try {
            // Get project root from environment or use current directory
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();

            // Initialize TaskStoreManager
            const storeManager = new TaskStoreManager(projectRoot);
            await storeManager.initialize();

            // Create task object with default status
            const task: TaskNode = {
                ...input,
                status: 'pickup', // Default status for new tasks
            };

            // Add task to store
            await storeManager.addTasks([task]);

            return `Task "${task.title}" (ID: ${task.id}) added successfully to Task System.`;
        } catch (error) {
            return `Error adding task: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
    {
        name: 'add_task',
        description: `Add a task to the Task System. The task will be stored in .claude/task.json.

**IMPORTANT**: Before using this tool, read the design-system-usage skill (.claude/skills/design-system-usage/SKILL.md) to understand:
- How to properly structure task hierarchies
- Task breakdown principles (single responsibility, independent completion, verifiable criteria)
- Correct usage of execution modes ('serial' vs 'parallel')
- How to define acceptanceCriteria and dependencies

Use this tool when you need to create a task for tracking purposes. Tasks can represent:
- Implementation work to be done
- Bugs that need to be fixed
- Features to implement
- Refactoring opportunities

Task properties:
- id: Unique identifier (use UUID or descriptive ID)
- title: Short task title (max 200 chars)
- description: Detailed task description
- execution: 'serial' or 'parallel' (for task groups with children)
- children: Array of subtasks (optional)
- agentType: Type of agent to assign (default, planner, reviewer, refactor, finder, debugger)
- threadId: LangGraph thread ID to associate with this task (optional, can be set when task starts execution)
- estimatedTime: Time estimate (e.g., "2h", "1d")
- complexity: 'simple', 'medium', or 'complex'
- dependencies: Array of task IDs this task depends on
- acceptanceCriteria: Array of completion criteria
- status: Initial status (default: 'pickup')
- startedAt: Start timestamp (auto-set when status becomes 'running')
- completedAt: Completion timestamp (auto-set when status becomes 'complete', 'error', or 'review')
- assignedTo: Agent type assigned to this task (auto-set when task starts)
- error: Error details if task failed

Note: Use read_tool to read task information from the database file.`,
        schema: TaskNodeSchema,
    }
);
