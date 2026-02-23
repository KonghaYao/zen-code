/**
 * 表格配置文件
 *
 * 为 ConfigView 的各个 tab 定义表格列配置
 */

import type { TableColumn, ActionItem } from '../../components/ui/Table.js';
import type { Agent, Model, Prompt, MCPServer, Tool, Middleware } from '../../types/index.js';
import { StatusBadge } from '../../components/index.js';

// ========================================
// Agents 表格配置
// ========================================

export const agentsColumns: TableColumn<Agent>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '30%',
        render: (value, record) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    🤖
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'description',
        title: 'Description',
        render: (value) => (
            <span className="text-[var(--color-text-muted)] line-clamp-2 block max-w-md" title={value || ''}>
                {value || '-'}
            </span>
        ),
    },
    {
        key: 'tools',
        title: 'Tools',
        align: 'center',
        render: (_, record) => <span>{Object.keys(record.tools || {}).length}</span>,
    },
];

export const agentsActions: ActionItem<Agent>[] = [
    {
        key: 'edit',
        label: 'Edit',
        onClick: (record) => {
            console.log('Edit agent:', record.id);
        },
    },
    {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: (record) => {
            console.log('Delete agent:', record.id);
        },
    },
];

// ========================================
// Models 表格配置
// ========================================

export const modelsColumns: TableColumn<Model>[] = [
    {
        key: 'model_name',
        title: 'Model Name',
        width: '40%',
        render: (value, record) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    🧠
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'model_provider',
        title: 'Provider',
    },
    {
        key: 'temperature',
        title: 'Temperature',
        align: 'center',
        render: (value) => <span>{value}</span>,
    },
];

export const modelsActions: ActionItem<Model>[] = [
    {
        key: 'edit',
        label: 'Edit',
        onClick: (record) => {
            console.log('Edit model:', record.id);
        },
    },
    {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: (record) => {
            console.log('Delete model:', record.id);
        },
    },
];

// ========================================
// Prompts 表格配置
// ========================================

export const promptsColumns: TableColumn<Prompt>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '35%',
        render: (value, record) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    📝
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'description',
        title: 'Description',
        render: (value) => (
            <span className="text-[var(--color-text-muted)] line-clamp-2 block max-w-md" title={value || ''}>
                {value || '-'}
            </span>
        ),
    },
    {
        key: 'current_version',
        title: 'Version',
        align: 'center',
    },
];

export const promptsActions: ActionItem<Prompt>[] = [
    {
        key: 'edit',
        label: 'Edit',
        onClick: (record) => {
            console.log('Edit prompt:', record.id);
        },
    },
    {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: (record) => {
            console.log('Delete prompt:', record.id);
        },
    },
];

// ========================================
// Skills 表格配置
// ========================================

export const skillsColumns: TableColumn<any>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '40%',
        render: (value) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    ✨
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'description',
        title: 'Description',
        render: (value) => (
            <span className="text-[var(--color-text-muted)] line-clamp-2 block max-w-md" title={value || ''}>
                {value || '-'}
            </span>
        ),
    },
    {
        key: 'location',
        title: 'Location',
    },
];

// ========================================
// MCP Servers 表格配置
// ========================================

export const mcpColumns: TableColumn<MCPServer>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '30%',
        render: (value, record) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    🔗
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'type',
        title: 'Type',
        render: (_, record) => <span>{record.config.type || 'stdio'}</span>,
    },
    {
        key: 'command',
        title: 'Command',
        render: (_, record) => (
            <span
                className="text-[var(--color-text-muted)] line-clamp-2 block max-w-md"
                title={record.config.command || ''}
            >
                {record.config.command || '-'}
            </span>
        ),
    },
    {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: (_, record) => <StatusBadge status={record.enabled ? 'active' : 'inactive'} />,
    },
];

export const mcpActions: ActionItem<MCPServer>[] = [
    {
        key: 'edit',
        label: 'Edit',
        onClick: (record) => {
            console.log('Edit MCP server:', record.id);
        },
    },
    {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: (record) => {
            console.log('Delete MCP server:', record.id);
        },
    },
];

// ========================================
// Tools 表格配置
// ========================================

export const toolsColumns: TableColumn<Tool>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '40%',
        render: (value) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    🔧
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'description',
        title: 'Description',
        render: (value) => (
            <span className="text-[var(--color-text-muted)] line-clamp-2 block max-w-xl" title={value || ''}>
                {value || '-'}
            </span>
        ),
    },
];

// ========================================
// Middlewares 表格配置
// ========================================

export const middlewaresColumns: TableColumn<Middleware>[] = [
    {
        key: 'name',
        title: 'Name',
        width: '35%',
        render: (value) => (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center text-lg">
                    🔌
                </div>
                <span className="font-medium">{value}</span>
            </div>
        ),
    },
    {
        key: 'description',
        title: 'Description',
        render: (value) => (
            <span className="text-[var(--color-text-muted)] line-clamp-2 block max-w-xl" title={value || ''}>
                {value || '-'}
            </span>
        ),
    },
    {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: () => <StatusBadge status="active" />,
    },
    {
        key: 'priority',
        title: 'Priority',
        align: 'center',
    },
];

// ========================================
// 统一配置导出
// ========================================

export interface TableConfig {
    columns: TableColumn<any>[];
    actions?: ActionItem<any>[];
    emptyMessage: string;
}

export const tableConfigs: Record<string, TableConfig> = {
    agents: {
        columns: agentsColumns,
        actions: agentsActions,
        emptyMessage: 'No agents yet. Create your first agent!',
    },
    models: {
        columns: modelsColumns,
        actions: modelsActions,
        emptyMessage: 'No models yet. Create your first model!',
    },
    prompts: {
        columns: promptsColumns,
        actions: promptsActions,
        emptyMessage: 'No prompts yet. Create your first prompt!',
    },
    skills: {
        columns: skillsColumns,
        emptyMessage: 'Skills are loaded from your project and user directories.',
    },
    mcp: {
        columns: mcpColumns,
        actions: mcpActions,
        emptyMessage: 'No MCP servers configured yet.',
    },
    tools: {
        columns: toolsColumns,
        emptyMessage: 'No tools yet.',
    },
    middlewares: {
        columns: middlewaresColumns,
        emptyMessage: 'No middlewares yet.',
    },
};
