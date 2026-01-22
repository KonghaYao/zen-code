/**
 * Middleware for loading and exposing agent skills to the system prompt.
 *
 * This middleware implements Anthropic's "Agent Skills" pattern with progressive disclosure:
 * 1. Parse YAML frontmatter from SKILL.md files at session start
 * 2. Inject skills metadata (name + description) into system prompt
 * 3. Agent reads full SKILL.md content when relevant to a task
 *
 * Skills directory structure (per-agent + project):
 * User-level: ~/.deepagents/{AGENT_NAME}/skills/
 * Project-level: {PROJECT_ROOT}/.deepagents/skills/
 *
 * Example structure:
 * ~/.deepagents/{AGENT_NAME}/skills/
 * ├── web-research/
 * │   ├── SKILL.md        # Required: YAML frontmatter + instructions
 * │   └── helper.py       # Optional: supporting files
 * ├── code-review/
 * │   ├── SKILL.md
 * │   └── checklist.md
 *
 * .deepagents/skills/
 * ├── project-specific/
 * │   └── SKILL.md        # Project-specific skills
 */

import { AgentMiddleware } from 'langchain';
import { listSkills, SkillMetadata } from '../skills/load.js';
import { AIMessage, SystemMessage } from '@langchain/core/messages';

// Skills System Documentation
const SKILLS_SYSTEM_PROMPT = `

## Skills System

You have access to a skills library that provides specialized capabilities and domain knowledge.

{skills_locations}

**Available Skills:**

{skills_list}

**How to Use Skills (Progressive Disclosure):**

Skills follow a **progressive disclosure** pattern - you know they exist (name + description above), but you only read the full instructions when needed:

1. **Recognize when a skill applies**: Check if the user's task matches any skill's description
2. **Read the skill's full instructions**: The skill list above shows the exact path to use with read_file
3. **Follow the skill's instructions**: SKILL.md contains step-by-step workflows, best practices, and examples
4. **Access supporting files**: Skills may include Python scripts, configs, or reference docs - use absolute paths

**When to Use Skills:**
- When the user's request matches a skill's domain (e.g., "research X" → web-research skill)
- When you need specialized knowledge or structured workflows
- When a skill provides proven patterns for complex tasks

**Skills are Self-Documenting:**
- Each SKILL.md tells you exactly what the skill does and how to use it
- The skill list above shows the full path for each skill's SKILL.md file

**Executing Skill Scripts:**
Skills may contain Python scripts or other executable files. Always use absolute paths from the skill list.

**Example Workflow:**

User: "Can you research the latest developments in quantum computing?"

1. Check available skills above → See "web-research" skill with its full path
2. Read the skill using the path shown in the list
3. Follow the skill's research workflow (search → organize → synthesize)
4. Use any helper scripts with absolute paths

Remember: Skills are tools to make you more capable and consistent. When in doubt, check if a skill exists for the task!
`;

/**
 * Middleware for loading and exposing agent skills.
 *
 * This middleware implements Anthropic's agent skills pattern:
 * - Loads skills metadata (name, description) from YAML frontmatter at session start
 * - Injects skills list into system prompt for discoverability
 * - Agent reads full SKILL.md content when a skill is relevant (progressive disclosure)
 *
 * Supports both user-level and project-level skills:
 * - User skills: ~/.deepagents/{AGENT_NAME}/skills/
 * - Project skills: {PROJECT_ROOT}/.deepagents/skills/
 * - Project skills override user skills with the same name
 */
export class SkillsMiddleware implements AgentMiddleware {
    name = 'SkillsMiddleware';
    // No context schema needed
    stateSchema = undefined;

    // No context schema needed
    contextSchema = undefined;

    // No additional tools
    tools = [];

    private skillsDir?: string;
    private assistantId?: string;
    private projectSkillsDir?: string;
    private userSkillsDisplay?: string;
    private systemPromptTemplate: string;

    /**
     * Initialize the skills middleware.
     *
     * @param skillsDir - Path to the user-level skills directory (per-agent)
     * @param assistantId - The agent identifier for path references in prompts
     * @param projectSkillsDir - Optional path to project-level skills directory
     */
    constructor(options: { skillsDir?: string; assistantId?: string; projectSkillsDir?: string } = {}) {
        this.skillsDir = options.skillsDir;
        this.assistantId = options.assistantId;
        this.projectSkillsDir = options.projectSkillsDir || './.claude/skills';

        if (this.skillsDir && !this.assistantId) {
            console.warn('user skills directory is provided, but assistant id is not provided');
        }
        // Store display paths for prompts
        if (this.assistantId) {
            this.userSkillsDisplay = `~/.deepagents/${this.assistantId}/skills`;
        }
        this.systemPromptTemplate = SKILLS_SYSTEM_PROMPT;
    }

    /**
     * Format skills locations for display in system prompt.
     */
    private formatSkillsLocations(): string {
        const locations = [];
        if (this.userSkillsDisplay) {
            locations.push(`**User Skills**: \`${this.userSkillsDisplay}\``);
        }
        if (this.projectSkillsDir) {
            locations.push(`**Project Skills**: \`${this.projectSkillsDir}\` (overrides user skills)`);
        }
        return locations.join('\n');
    }

    /**
     * Format skills metadata for display in system prompt.
     */
    private formatSkillsList(skills: SkillMetadata[]): string {
        if (!skills.length) {
            const locations = [`${this.userSkillsDisplay}/`];
            if (this.projectSkillsDir) {
                locations.push(`${this.projectSkillsDir}/`);
            }
            return `(No skills available yet. You can create skills in ${locations.join(' or ')})`;
        }

        // Group skills by source
        const userSkills = skills.filter((s) => s.source === 'user');
        const projectSkills = skills.filter((s) => s.source === 'project');

        const lines: string[] = [];

        // Show user skills
        if (userSkills.length) {
            lines.push('**User Skills:**');
            for (const skill of userSkills) {
                lines.push(`- **${skill.name}**: ${skill.description}`);
                lines.push(`  → Read \`${skill.path}\` for full instructions`);
            }
            lines.push('');
        }

        // Show project skills
        if (projectSkills.length) {
            lines.push('**Project Skills:**');
            for (const skill of projectSkills) {
                lines.push(`- **${skill.name}**: ${skill.description}`);
                lines.push(`  → Read \`${skill.path}\` for full instructions`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Inject skills documentation into the system prompt.
     *
     * This runs on every model call to ensure skills info is always available.
     *
     * @param request - The model request being processed
     * @param handler - The handler function to call with the modified request
     * @returns The model response from the handler
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // Get skills metadata from state
        const skillsMetadata = listSkills(this.skillsDir, this.projectSkillsDir);

        // Format skills locations and list
        const skillsLocations = this.formatSkillsLocations();
        const skillsList = this.formatSkillsList(skillsMetadata);

        // Format the skills documentation
        const skillsSection = this.systemPromptTemplate
            .replace('{skills_locations}', skillsLocations)
            .replace('{skills_list}', skillsList);

        // Create new system message by appending skills section
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + '\n\n' + skillsSection;
        } else {
            newSystemPrompt = skillsSection;
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
