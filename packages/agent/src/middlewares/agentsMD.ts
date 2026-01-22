/**
 * Middleware for loading and exposing AGENTS.md / CLAUDE.md documentation to the system prompt.
 *
 * This middleware implements a progressive disclosure pattern for project documentation files:
 * 1. Load AGENTS.md or CLAUDE.md content at session start
 * 2. Inject documentation info into system prompt for discoverability
 * 3. Agent reads full documentation content when relevant to a task
 *
 * Supports root-level files: {PROJECT_ROOT}/AGENTS.md or {PROJECT_ROOT}/CLAUDE.md
 * CLAUDE.md is an alias for AGENTS.md (both refer to the same project documentation)
 */

import { AgentMiddleware } from 'langchain';
import { AIMessage, SystemMessage } from '@langchain/core/messages';
import fs from 'fs/promises';
import { join } from 'path';

// Documentation System Prompt
const DOCS_SYSTEM_PROMPT = `

## Project Documentation

{docs_content}`;

/**
 * Middleware for loading and exposing AGENTS.md / CLAUDE.md documentation.
 *
 * This middleware implements progressive disclosure for project documentation:
 * - Loads metadata from AGENTS.md or CLAUDE.md at session start
 * - Injects documentation info into system prompt for discoverability
 * - Agent reads full documentation content when relevant (progressive disclosure)
 *
 * Priority: CLAUDE.md > AGENTS.md (CLAUDE.md takes precedence if both exist)
 *
 * Supports root-level files: {PROJECT_ROOT}/AGENTS.md or {PROJECT_ROOT}/CLAUDE.md
 */
export class AgentsMdMiddleware implements AgentMiddleware {
    name = 'AgentsMdMiddleware';
    stateSchema = undefined;
    contextSchema = undefined;
    tools = [];

    private projectRoot: string;
    private systemPromptTemplate: string;

    /**
     * Initialize the documentation middleware.
     *
     * @param projectRoot - Path to the project root directory (defaults to process.cwd())
     */
    constructor(options: { projectRoot?: string } = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.systemPromptTemplate = DOCS_SYSTEM_PROMPT;
    }

    /**
     * Find and read the project documentation file.
     * Priority: CLAUDE.md > AGENTS.md
     *
     * @returns The content of the first found documentation file, or null if none exist
     */
    private async findDocumentationFile(): Promise<{ content: string; filename: string } | null> {
        const candidates = ['CLAUDE.md', 'AGENTS.md'];

        for (const filename of candidates) {
            const filePath = join(this.projectRoot, filename);
            try {
                await fs.access(filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                return { content, filename };
            } catch {
                // File doesn't exist, try next candidate
                continue;
            }
        }

        return null;
    }

    /**
     * Inject project documentation into the system prompt.
     *
     * This runs on every model call to ensure documentation info is always available.
     *
     * @param request - The model request being processed
     * @param handler - The handler function to call with the modified request
     * @returns The model response from the handler
     */
    async wrapModelCall(request: any, handler: any): Promise<AIMessage> {
        // Try to find and read documentation file
        const docsFile = await this.findDocumentationFile();

        if (!docsFile) {
            // No documentation file found, proceed without modification
            return await handler(request);
        }

        // Format the documentation content
        const docsSection = this.systemPromptTemplate.replace('{docs_content}', docsFile.content);

        // Create new system message by appending documentation section
        let newSystemPrompt: string;
        if (request.systemPrompt) {
            newSystemPrompt = request.systemPrompt + '\n\n' + docsSection;
        } else {
            newSystemPrompt = docsSection;
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
