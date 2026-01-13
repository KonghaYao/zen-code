/**
 * Middleware for loading and exposing agent memories to the system prompt.
 *
 * This middleware implements a memory system pattern with progressive disclosure:
 * 1. Parse YAML frontmatter from MEMORY.md files at session start
 * 2. Inject memories metadata (name + description + tags) into system prompt
 * 3. Agent reads full MEMORY.md content when relevant to a task
 *
 * Memories directory structure (per-agent + project):
 * User-level: ~/.deepagents/{AGENT_NAME}/memories/
 * Project-level: {PROJECT_ROOT}/.deepagents/memories/
 *
 * Example structure:
 * ~/.deepagents/{AGENT_NAME}/memories/
 * ├── langgraph-model-initialization/
 * │   └── MEMORY.md        # Required: YAML frontmatter + content
 * ├── bug-fixes/
 * │   └── MEMORY.md
 *
 * .deepagents/memories/
 * ├── project-setup/
 * │   └── MEMORY.md        # Project-specific memories
 */

import { AgentMiddleware } from 'langchain';
import { listMemories, MemoryMetadata } from '../memories/load.js';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

// Memory System Documentation
const MEMORIES_SYSTEM_PROMPT = `

## Memory System

你可以访问一个包含之前任务和经验知识的记忆库。

{memories_locations}

**可用的记忆：**

{memories_list}

**如何使用记忆（渐进式披露）:**

记忆采用 **渐进式披露** 模式 - 你知道它们存在（上面有元数据），但只在需要时才读取完整内容：

1. **识别适用的记忆**: 检查当前任务是否匹配任何记忆的描述或标签
2. **读取完整记忆内容**: 使用 read_file 工具，路径见上面的列表
3. **应用知识**: 使用记忆中的信息来指导当前任务
4. **更新或创建记忆**: 完成任务后，考虑创建或更新记忆

**何时使用记忆：**
- 遇到与之前任务类似的问题时
- 需要回忆项目特定的约定或模式时
- 需要参考之前的解决方案或决策时
- 需要记住配置或设置细节时

**何时创建记忆：**
- 解决了一个可能再次遇到的非平凡问题后
- 做出重要的架构决策后
- 发现有用的模式或工作流程后
- 学习了项目特定的约定后

**记忆创建工作流程：**
1. 识别值得记住的关键信息
2. 确定合适的类别和标签
3. 创建带有正确 frontmatter 的 MEMORY.md
4. 编写清晰、可操作的内容和代码示例
5. 使用 write_file 工具保存记忆

**分类：**
- **architecture**: 架构决策、设计模式、系统结构
- **bug-fix**: Bug 修复和问题解决方案
- **workflow**: 工作流程和最佳实践
- **configuration**: 配置和环境设置
- **optimization**: 性能优化和改进

记住：记忆是帮助你变得更强大和一致的工具。有疑问时，检查是否有相关的记忆存在！
`;

/**
 * Middleware for loading and exposing agent memories.
 *
 * This middleware implements a memory system pattern:
 * - Loads memories metadata (name, description, tags, category) from YAML frontmatter at session start
 * - Injects memories list into system prompt for discoverability
 * - Agent reads full MEMORY.md content when a memory is relevant (progressive disclosure)
 *
 * Supports both user-level and project-level memories:
 * - User memories: ~/.deepagents/{AGENT_NAME}/memories/
 * - Project memories: {PROJECT_ROOT}/.deepagents/memories/
 * - Project memories override user memories with the same name
 */
export class MemoriesMiddleware implements AgentMiddleware {
    name = 'MemoriesMiddleware';
    // No context schema needed
    stateSchema = undefined;

    // No context schema needed
    contextSchema = undefined;

    // No additional tools
    tools = [];

    private memoriesDir?: string;
    private assistantId?: string;
    private projectMemoriesDir?: string;
    private userMemoriesDisplay?: string;
    private systemPromptTemplate: string;

    /**
     * Initialize the memories middleware.
     *
     * @param memoriesDir - Path to the user-level memories directory (per-agent)
     * @param assistantId - The agent identifier for path references in prompts
     * @param projectMemoriesDir - Optional path to project-level memories directory
     */
    constructor(options: { memoriesDir?: string; assistantId?: string; projectMemoriesDir?: string } = {}) {
        this.memoriesDir = options.memoriesDir;
        this.assistantId = options.assistantId;
        this.projectMemoriesDir = options.projectMemoriesDir || './.deepagents/memories';

        if (this.memoriesDir && !this.assistantId) {
            console.warn('user memories directory is provided, but assistant id is not provided');
        }
        // Store display paths for prompts
        if (this.assistantId) {
            this.userMemoriesDisplay = `~/.deepagents/${this.assistantId}/memories`;
        }
        this.systemPromptTemplate = MEMORIES_SYSTEM_PROMPT;
    }

    /**
     * Format memories locations for display in system prompt.
     */
    private formatMemoriesLocations(): string {
        const locations = [];
        if (this.userMemoriesDisplay) {
            locations.push(`**User Memories**: \`${this.userMemoriesDisplay}\``);
        }
        if (this.projectMemoriesDir) {
            locations.push(`**Project Memories**: \`${this.projectMemoriesDir}\` (overrides user memories)`);
        }
        return locations.join('\n');
    }

    /**
     * Format memories metadata for display in system prompt.
     */
    private formatMemoriesList(memories: MemoryMetadata[]): string {
        if (!memories.length) {
            const locations = [`${this.userMemoriesDisplay}/`];
            if (this.projectMemoriesDir) {
                locations.push(`${this.projectMemoriesDir}/`);
            }
            return `(No memories available yet. You can create memories in ${locations.join(' or ')})`;
        }

        // Group memories by category
        const categoryOrder = ['architecture', 'bug-fix', 'workflow', 'configuration', 'optimization'];
        const memoriesByCategory = new Map<string, MemoryMetadata[]>();

        for (const memory of memories) {
            if (!memoriesByCategory.has(memory.category)) {
                memoriesByCategory.set(memory.category, []);
            }
            memoriesByCategory.get(memory.category)!.push(memory);
        }

        const lines: string[] = [];

        // Show memories by category
        for (const category of categoryOrder) {
            const categoryMemories = memoriesByCategory.get(category);
            if (!categoryMemories || categoryMemories.length === 0) {
                continue;
            }

            lines.push(`**${category.charAt(0).toUpperCase() + category.slice(1)} Memories:**`);

            // Sort by priority (high > medium > low) and then by name
            const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
            categoryMemories.sort((a, b) => {
                const priorityA = priorityOrder[a.priority || 'medium'] ?? 1;
                const priorityB = priorityOrder[b.priority || 'medium'] ?? 1;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return a.name.localeCompare(b.name);
            });

            for (const memory of categoryMemories) {
                const tagsStr = memory.tags.length > 0 ? ` [${memory.tags.join(', ')}]` : '';
                lines.push(`- **${memory.name}**: ${memory.description}${tagsStr}`);
                lines.push(`  → Read \`${memory.path}\` for full content`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Inject memories documentation into the system prompt.
     *
     * This runs on every model call to ensure memories info is always available.
     *
     * @param request - The model request being processed
     * @param handler - The handler function to call with the modified request
     * @returns The model response from the handler
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // Get memories metadata from state
        const memoriesMetadata = listMemories(this.memoriesDir, this.projectMemoriesDir);

        // Format memories locations and list
        const memoriesLocations = this.formatMemoriesLocations();
        const memoriesList = this.formatMemoriesList(memoriesMetadata);

        // Format the memories documentation
        const memoriesSection = this.systemPromptTemplate
            .replace('{memories_locations}', memoriesLocations)
            .replace('{memories_list}', memoriesList);

        // Create new system message by appending memories section
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + '\n\n' + memoriesSection;
        } else {
            newSystemPrompt = memoriesSection;
        }

        // Create a new system message
        const newSystemMessage = new SystemMessage(newSystemPrompt);

        // Create modified request
        const modifiedRequest = {
            ...request,
            systemMessage: newSystemMessage,
        };

        // Call the handler with modified request
        return await handler(modifiedRequest);
    }
}
