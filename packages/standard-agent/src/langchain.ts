import { z } from 'zod';
import type { ToolImplementation } from './types.js';

// ============ Adapter Function ============
/**
 * Drop-in replacement for @langchain/core/tools/tool()
 * Matches exact signature for easy migration
 *
 * @example
 * ```typescript
 * import { fromLangChainTool as tool } from './langchain.js';
 *
 * const readFileTool = tool(
 *     async ({ path }) => {
 *         return fs.readFileSync(path, 'utf-8');
 *     },
 *     {
 *         name: 'readFile',
 *         description: 'Read file contents',
 *         schema: z.object({ path: z.string() })
 *     }
 * );
 *
 * toolRegistry.registerImplementation(readFileTool);
 * ```
 */
export function fromLangChainTool<Params = unknown, Result = unknown>(
    func: (input: Params) => Promise<Result> | Result,
    config: {
        name: string;
        description: string;
        schema?: z.ZodType<Params>;
    },
    options?: { id?: string },
): ToolImplementation<Params, Result> {
    return {
        id: options?.id ?? config.name,
        name: config.name,
        description: config.description,
        paramsSchema: config.schema,
        execute: func,
    };
}

/**
 * Alias for better naming - matches the intent of converting to standard agent tool
 */
export const toStandardTool = fromLangChainTool;
