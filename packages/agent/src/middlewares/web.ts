import { AgentMiddleware } from 'langchain';
import { tool } from 'langchain';
import { ExtractSchema, webFetch } from '@langgraph-js/web-fetch';

const web_fetch_tool = tool(
    async (params) => {
        const response = await webFetch(params);
        if (response.failed_results.length > 0) {
            const failed = response.failed_results.map((f) => `- ${f.url}: ${f.error}`).join('\n');
            const succeeded = response.results.map((r) => r.raw_content).join('\n\n---\n\n');
            return succeeded ? `${succeeded}\n\n**Failed URLs:**\n${failed}` : `All URLs failed:\n${failed}`;
        }
        return response.results.map((r) => r.raw_content).join('\n\n---\n\n');
    },
    {
        name: 'web_fetch',
        description:
            'Fetch and extract readable content from one or more URLs. Returns Markdown-formatted content with YAML frontmatter. Supports general web pages, Feishu docs, Docker Hub, and more.',
        schema: ExtractSchema,
    },
);

export const WebMiddleware = {
    name: 'web',
    tools: [web_fetch_tool as any],
} as AgentMiddleware;
