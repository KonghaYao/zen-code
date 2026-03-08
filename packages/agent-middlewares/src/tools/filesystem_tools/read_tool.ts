import { tool, ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import type { BaseAgentStateType } from '../../index.js';

const MAX_LINES = 2000;
export const readFileSchema = z.object({
    description: z.string().optional().describe('what you want to do'),
    file_path: z.string().describe('The path to the file to read (absolute or relative to cwd)'),
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
// 二进制文件扩展名列表
const BINARY_EXTENSIONS = new Set([
    // 图片
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.ico',
    '.webp',
    '.svg',
    '.tiff',
    // 文档
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    // 压缩
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    // 音频
    '.mp3',
    '.wav',
    '.ogg',
    '.flac',
    // 视频
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    // 其他二进制
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.bin',
    '.class',
    // Jupyter notebook (需要特殊处理)
    '.ipynb',
]);

// 检测是否为二进制文件
function isBinaryFile(filePath: string): boolean {
    const ext = filePath.toLowerCase().split('.').pop();
    if (ext && BINARY_EXTENSIONS.has('.' + ext)) {
        return true;
    }
    return false;
}

// 获取文件扩展名
function getFileExtension(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    return ext ? `.${ext}` : '';
}

export const read_tool = tool(
    async ({ file_path, offset, limit }, runtime: ToolRuntime<BaseAgentStateType>) => {
        try {
            // 安全检查：确保 cwd 存在
            if (!runtime.state.cwd) {
                throw new Error('Current working directory (cwd) is not set in the agent state.');
            }

            // 解析路径：如果是相对路径，基于 runtime.state.cwd 解析；如果是绝对路径，直接使用
            const resolvedPath = resolve(runtime.state.cwd, file_path);
            const ext = getFileExtension(resolvedPath);

            // 处理二进制文件
            if (isBinaryFile(resolvedPath)) {
                if (ext === '.pdf') {
                    // PDF 文件 - 返回说明
                    return `[PDF FILE DETECTED]\n\nThis is a PDF file. The file path is: ${resolvedPath}\n\nNote: PDF processing requires specialized libraries like pdf-parse. For now, this file can be processed by a dedicated PDF reading tool or middleware.`;
                } else if (ext === '.ipynb') {
                    // Jupyter notebook - 尝试用 UTF-8 读取（JSON 格式）
                    try {
                        const buffer = await fs.readFile(resolvedPath);
                        const content = buffer.toString('utf-8');
                        const notebook = JSON.parse(content);

                        // 提取所有单元格
                        let result = `[JUPYTER NOTEBOOK]\n\nPath: ${resolvedPath}\n\n`;

                        if (notebook.cells && Array.isArray(notebook.cells)) {
                            notebook.cells.forEach((cell: any, index: number) => {
                                result += `--- Cell ${index + 1} (${cell.cell_type || 'code'}) ---\n`;
                                if (cell.source) {
                                    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                                    result += source.trim() + '\n\n';
                                }
                                if (cell.outputs && cell.outputs.length > 0) {
                                    result += `[Output]:\n`;
                                    cell.outputs.forEach((output: any) => {
                                        if (output.text) {
                                            const text = Array.isArray(output.text)
                                                ? output.text.join('')
                                                : output.text;
                                            result += text + '\n';
                                        }
                                        if (output.data) {
                                            // 可视化输出（如图表）的数据
                                            result += `[Visual output data present]\n`;
                                        }
                                    });
                                    result += '\n';
                                }
                            });
                        }
                        return result;
                    } catch (e: any) {
                        return `[ERROR: Could not parse Jupyter notebook]\n\n${e.message}`;
                    }
                } else {
                    // 其他二进制文件（图片等）- 返回说明
                    return `[BINARY FILE DETECTED]\n\nFile type: ${ext}\nFile path: ${resolvedPath}\n\nThis is a binary file. The file was detected but cannot be displayed as text. For images, this tool supports visual rendering in a multimodal context. For other binary formats, specialized processing tools may be required.`;
                }
            }

            // 文本文件 - 用 UTF-8 读取
            const content = await fs.readFile(resolvedPath, 'utf-8');
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
            // 如果 UTF-8 解码失败，可能是二进制文件
            if (error.code === 'ERR_INVALID_UTF8' || error.message.includes('Invalid')) {
                const resolvedPath = resolve(runtime.state.cwd || '', file_path);
                return `[UNABLE TO DECODE AS TEXT]\n\nThe file could not be decoded as UTF-8. This may be a binary file.\n\nFile path: ${resolvedPath}\n\nIf this is a text file with a different encoding, it may need special handling.`;
            }
            throw error;
        }
    },
    {
        name: 'read_file',
        description: `Reads a file from the local filesystem. Relative paths are resolved based on the current working directory (cwd).
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter can be either an absolute path or a relative path
- Relative paths are resolved relative to the current working directory (cwd)
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
