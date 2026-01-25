import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';

const MAX_LINES = 2000;
export const readFileSchema = z.object({
    description: z.string().optional().describe('what you want to do'),
    file_path: z.string().describe('The absolute path to the file to read'),
    offset: z
        .number()
        .default(0)
        .optional()
        .describe('The line number to start reading from. Only provide if the file is too large to read at once'),
    limit: z
        .number()
        .default(MAX_LINES)
        .optional()
        .describe('The number of lines to read. Only provide if the file is too large to read at once.'),
});
export const read_tool = tool(
    async ({ file_path, offset, limit }) => {
        try {
            const content = await fs.readFile(file_path, 'utf-8');
            let lines = content.split('\n');
            if (offset) {
                lines = lines.slice(offset - 1);
            }
            if (limit) {
                lines = lines.slice(0, limit);
            }
            return lines.join('\n');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return `Error: File not found at ${file_path}`;
            }
            throw error;
        }
    },
    {
        name: 'read_file',
        description: `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${MAX_LINES} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than ${MAX_LINES} characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows You to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as You is a multimodal LLM.
- This tool can read PDF files (.pdf). PDFs are processed page by page, extracting both text and visual content for analysis.
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful. 
- You will regularly be asked to read screenshots. If the user provides a path to a screenshot ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths like /var/folders/123/abc/T/TemporaryItems/NSIRD_screencaptureui_ZfB1tD/Screenshot.png
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.`,
        schema: readFileSchema,
    },
);
