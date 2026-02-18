import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
export const editToolSchema = z.object({
    description: z.string().optional().describe('what you want to do'),
    file_path: z.string().describe('The absolute path to the file to modify'),
    old_string: z.string().describe('The text to replace'),
    new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
    replace_all: z.boolean().optional().default(false).describe('Replace all occurences of old_string (default false)'),
});

export const replace_tool = tool(
    async ({ file_path, old_string, new_string, replace_all = false }) => {
        try {
            const content = await fs.readFile(file_path, 'utf-8');

            if (replace_all) {
                if (!content.includes(old_string)) {
                    return `Error: old_string not found in ${file_path}`;
                }
                // Use split/join for global replacement to avoid regex escaping issues
                const newContent = content.split(old_string).join(new_string);
                await fs.writeFile(file_path, newContent, 'utf-8');
                return `File ${file_path} has been edited successfully. Replaced all occurrences of old_string.`;
            } else {
                const parts = content.split(old_string);
                if (parts.length === 1) {
                    return `Error: old_string not found in ${file_path}`;
                }
                if (parts.length > 2) {
                    return `Error: old_string is not unique in ${file_path} (found ${
                        parts.length - 1
                    } occurrences). Please provide more context or set replace_all to true.`;
                }

                // Exactly one occurrence found
                const newContent = content.replace(old_string, new_string);
                await fs.writeFile(file_path, newContent, 'utf-8');
                return `File ${file_path} has been edited successfully. Replaced single occurrence of old_string.`;
            }
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: File not found at ${file_path}`;
            }
            throw error;
        }
    },
    {
        name: 'edit_file',
        description: `Performs exact string replacements in files. 

Usage:
- You must use your \`Read\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. 
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`. 
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,
        schema: editToolSchema,
    },
);
