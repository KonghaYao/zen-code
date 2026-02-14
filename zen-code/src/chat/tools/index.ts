import { ask_user_questions } from './ask_user_questions';
import { terminal } from './terminal';
import { replace_in_file } from './replace_in_file';
import { todo_tool } from './todo_tool';
import { read_file } from './read_file';
import { glob_files } from './glob_files';
import { write_file } from './write_file';
import { folder_operations } from './folder_operations';
import { load_mcp_tools } from './mcp/load_mcp_tools';
import { execute_mcp_tool } from './mcp/execute_mcp_tool';

export default [
    terminal,
    ask_user_questions,
    replace_in_file,
    todo_tool,
    read_file,
    glob_files,
    write_file,
    folder_operations,
    load_mcp_tools,
    execute_mcp_tool,
];
