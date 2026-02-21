/**
 * FileExplorer 组件导出
 */

// 原有组件
export { FileIcon } from './FileIcon.js';
export { BreadcrumbNav } from './BreadcrumbNav.js';
export { Toolbar } from './Toolbar.js';
export { FileList } from './FileList.js';
export { FileGrid } from './FileGrid.js';
export { DropZone } from './DropZone.js';
export { CreateFolderDialog, CreateFileDialog, RenameDialog, DeleteConfirmDialog } from './FileDialogs.js';

// VSCode 风格三栏布局组件
export { FileTree } from './FileTree/index.js';
export type { TreeNode } from './FileTree/FileTree.js';
export { PreviewPanel } from './Preview/index.js';
export { SearchPanel } from './Search/index.js';
