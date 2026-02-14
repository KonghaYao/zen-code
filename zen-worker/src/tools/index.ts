/**
 * Tools Export
 *
 * 导出所有 UI 工具定义，用于注册到 LangGraph SDK
 */

import { terminal } from './terminal';
import { read_file } from './read_file';
import { write_file } from './write_file';
import { glob_files } from './glob_files';
import { folder_operations } from './folder_operations';
import { todo_tool } from './todo_tool';
import { replace_in_file } from './replace_in_file';
import { load_mcp_tools } from './mcp/load_mcp_tools';
import { execute_mcp_tool } from './mcp/execute_mcp_tool';

/**
 * 默认工具列表
 * 在 ChatPage 中通过 setTools() 注册
 */
export default [
    terminal,
    replace_in_file,
    todo_tool,
    read_file,
    glob_files,
    write_file,
    folder_operations,
    load_mcp_tools,
    execute_mcp_tool,
];
