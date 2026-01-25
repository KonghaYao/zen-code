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
import { batch_command } from './batch_command';
import { ask_user_with_options } from './ask_user_with_options';
import { todo_tool } from './todo_tool';
import { replace_in_file } from './replace_in_file';

/**
 * 默认工具列表
 * 在 ChatPage 中通过 setTools() 注册
 */
export default [
    terminal,
    ask_user_with_options,
    replace_in_file,
    todo_tool,
    read_file,
    glob_files,
    write_file,
    folder_operations,
    batch_command,
];
