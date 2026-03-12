import { describe, it, expect } from 'vitest';
import { parseAgentMd, validateAgentConfig } from '../parser.js';
import type { ClaudeAgentConfig } from '../types.js';

describe('parseAgentMd', () => {
    it('should parse basic agent with frontmatter', () => {
        const content = `---
name: test-agent
description: A test agent for unit testing
---

You are a helpful test agent.`;

        const result = parseAgentMd(content, '/path/to/agent.md');

        expect(result.name).toBe('test-agent');
        expect(result.description).toBe('A test agent for unit testing');
        expect(result.systemPrompt).toBe('You are a helpful test agent.');
        expect(result.filePath).toBe('/path/to/agent.md');
    });

    it('should parse agent with all optional fields', () => {
        const content = `---
name: full-agent
description: Agent with all options
model: opus
tools:
  - read
  - write
  - bash
disallowedTools:
  - delete
skills:
  - codebase-exploration
  - langgraph-development
memory: project
permissionMode: acceptEdits
maxTurns: 10
background: true
isolation: worktree
---

Full agent system prompt.`;

        const result = parseAgentMd(content);

        expect(result.name).toBe('full-agent');
        expect(result.model).toBe('opus');
        expect(result.tools).toEqual(['read', 'write', 'bash']);
        expect(result.disallowedTools).toEqual(['delete']);
        expect(result.skills).toEqual(['codebase-exploration', 'langgraph-development']);
        expect(result.memory).toBe('project');
        expect(result.permissionMode).toBe('acceptEdits');
        expect(result.maxTurns).toBe(10);
        expect(result.background).toBe(true);
        expect(result.isolation).toBe('worktree');
    });

    it('should parse hooks configuration', () => {
        const content = `---
name: hooked-agent
description: Agent with hooks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./check-script.sh"
  PostToolUse:
    - hooks:
        - type: command
          command: "./log-usage.sh"
---

Agent with hooks.`;

        const result = parseAgentMd(content);

        expect(result.hooks).toBeDefined();
        expect(result.hooks?.PreToolUse).toHaveLength(1);
        expect(result.hooks?.PreToolUse?.[0].matcher).toBe('Bash');
        expect(result.hooks?.PreToolUse?.[0].hooks[0].command).toBe('./check-script.sh');
        expect(result.hooks?.PostToolUse).toHaveLength(1);
    });

    it('should parse mcpServers configuration', () => {
        const content = `---
name: mcp-agent
description: Agent with MCP servers
mcpServers:
  filesystem:
    command: npx
    args:
      - "-y"
      - "@anthropic-ai/mcp-server-filesystem"
      - "/path/to/files"
  postgres:
    url: postgres://localhost:5432/db
---

Agent with MCP.`;

        const result = parseAgentMd(content);

        expect(result.mcpServers).toBeDefined();
        expect(result.mcpServers?.filesystem).toEqual({
            command: 'npx',
            args: ['-y', '@anthropic-ai/mcp-server-filesystem', '/path/to/files'],
        });
        expect(result.mcpServers?.postgres).toEqual({
            url: 'postgres://localhost:5432/db',
        });
    });

    it('should handle multiline markdown content', () => {
        const content = `---
name: markdown-agent
description: Agent with complex markdown
---

# System Prompt

This is a complex markdown document.

## Section 1
- Item 1
- Item 2

## Section 2
\`\`\`typescript
const x = 1;
\`\`\`

End of prompt.`;

        const result = parseAgentMd(content);

        expect(result.systemPrompt).toContain('# System Prompt');
        expect(result.systemPrompt).toContain('## Section 1');
        expect(result.systemPrompt).toContain('const x = 1;');
    });

    it('should trim whitespace from system prompt', () => {
        const content = `---
name: trim-agent
description: Test trimming
---

   
  Padded content  
   

`;

        const result = parseAgentMd(content);

        expect(result.systemPrompt).toBe('Padded content');
    });

    it('should throw error for missing name', () => {
        const content = `---
description: Missing name field
---

System prompt.`;

        expect(() => parseAgentMd(content)).toThrow('Agent name is required');
    });

    it('should throw error for missing description', () => {
        const content = `---
name: no-desc
---

System prompt.`;

        expect(() => parseAgentMd(content)).toThrow('Agent description is required');
    });

    it('should throw error for invalid YAML frontmatter', () => {
        const content = `---
name: [invalid
description: test
---

System prompt.`;

        expect(() => parseAgentMd(content)).toThrow();
    });

    it('should handle empty frontmatter gracefully', () => {
        const content = `---
---

Just markdown content.`;

        expect(() => parseAgentMd(content)).toThrow('Agent name is required');
    });

    it('should convert array strings to arrays', () => {
        const content = `---
name: array-agent
description: Test array parsing
tools: ["read", "write"]
---

System prompt.`;

        const result = parseAgentMd(content);

        expect(Array.isArray(result.tools)).toBe(true);
        expect(result.tools).toEqual(['read', 'write']);
    });

    it('should handle model: inherit', () => {
        const content = `---
name: inherit-agent
description: Uses inherited model
model: inherit
---

System prompt.`;

        const result = parseAgentMd(content);

        expect(result.model).toBe('inherit');
    });
});

describe('validateAgentConfig', () => {
    it('should return empty array for valid config', () => {
        const config: ClaudeAgentConfig = {
            name: 'valid-agent',
            description: 'A valid agent',
            systemPrompt: 'System prompt',
        };

        const errors = validateAgentConfig(config);

        expect(errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
        const config = {
            description: 'Missing name',
            systemPrompt: 'System prompt',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Agent name is required');
    });

    it('should return error for empty name', () => {
        const config: ClaudeAgentConfig = {
            name: '',
            description: 'Empty name',
            systemPrompt: 'System prompt',
        };

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Agent name is required');
    });

    it('should return error for missing description', () => {
        const config = {
            name: 'no-desc',
            systemPrompt: 'System prompt',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Agent description is required');
    });

    it('should return error for invalid model', () => {
        const config = {
            name: 'invalid-model',
            description: 'Invalid model',
            systemPrompt: 'System prompt',
            model: 'invalid-model-value',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain(
            'Invalid model value: invalid-model-value. Must be one of: sonnet, opus, haiku, inherit',
        );
    });

    it('should return error for invalid permissionMode', () => {
        const config = {
            name: 'invalid-mode',
            description: 'Invalid mode',
            systemPrompt: 'System prompt',
            permissionMode: 'invalid',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Invalid permissionMode: invalid');
    });

    it('should return error for invalid memory', () => {
        const config = {
            name: 'invalid-memory',
            description: 'Invalid memory',
            systemPrompt: 'System prompt',
            memory: 'invalid',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Invalid memory value: invalid');
    });

    it('should return error for negative maxTurns', () => {
        const config: ClaudeAgentConfig = {
            name: 'negative-turns',
            description: 'Negative turns',
            systemPrompt: 'System prompt',
            maxTurns: -1,
        };

        const errors = validateAgentConfig(config);

        expect(errors).toContain('maxTurns must be a positive number');
    });

    it('should return error for invalid isolation', () => {
        const config = {
            name: 'invalid-isolation',
            description: 'Invalid isolation',
            systemPrompt: 'System prompt',
            isolation: 'invalid',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors).toContain('Invalid isolation value: invalid. Must be: worktree');
    });

    it('should return multiple errors', () => {
        const config = {
            systemPrompt: 'System prompt',
        } as ClaudeAgentConfig;

        const errors = validateAgentConfig(config);

        expect(errors.length).toBeGreaterThanOrEqual(2);
        expect(errors).toContain('Agent name is required');
        expect(errors).toContain('Agent description is required');
    });

    it('should validate hooks structure', () => {
        const config: ClaudeAgentConfig = {
            name: 'bad-hooks',
            description: 'Bad hooks',
            systemPrompt: 'System prompt',
            hooks: {
                PreToolUse: [
                    {
                        hooks: [],
                    },
                ],
            },
        };

        const errors = validateAgentConfig(config);

        expect(errors).toContain('PreToolUse hook at index 0 must have at least one hook defined');
    });
});
