/**
 * Tool Registry - 工具元数据注册系统
 *
 * 为工具提供额外的显示信息和自定义渲染逻辑
 */

import React from 'react';
import type { RenderMessage } from '@langgraph-js/sdk';

/**
 * 工具元数据
 */
export interface ToolMetadata {
    /** 工具唯一名称 */
    name: string;
    /** 显示名称 */
    displayName?: string;
    /** 描述 */
    description?: string;
    /** 图标 */
    icon?: string;
    /** 颜色 */
    color?: string;
    /** 是否需要审批 */
    requiresApproval?: boolean;
    /** 参数显示配置 */
    paramDisplay?: {
        /** 隐藏的参数 */
        hide?: string[];
        /** 格式化的参数 */
        format?: Record<string, (value: any) => string>;
    };
    /** 自定义渲染组件 */
    customRenderer?: React.ComponentType<{ message: RenderMessage }>;
}

/**
 * 工具注册表
 */
class ToolRegistryClass {
    private tools = new Map<string, ToolMetadata>();

    /**
     * 注册工具元数据
     */
    register(metadata: ToolMetadata) {
        this.tools.set(metadata.name, metadata);
    }

    /**
     * 批量注册
     */
    registerAll(metadataList: ToolMetadata[]) {
        metadataList.forEach((metadata) => this.register(metadata));
    }

    /**
     * 获取工具元数据
     */
    get(name: string): ToolMetadata | undefined {
        return this.tools.get(name);
    }

    /**
     * 获取所有工具
     */
    getAll(): ToolMetadata[] {
        return Array.from(this.tools.values());
    }

    /**
     * 检查工具是否需要审批
     */
    requiresApproval(name: string): boolean {
        const metadata = this.tools.get(name);
        return metadata?.requiresApproval ?? false;
    }

    /**
     * 获取工具的显示名称
     */
    getDisplayName(name: string): string {
        const metadata = this.tools.get(name);
        return metadata?.displayName || name;
    }

    /**
     * 获取工具的图标
     */
    getIcon(name: string): string {
        const metadata = this.tools.get(name);
        return metadata?.icon || '🔧';
    }

    /**
     * 获取工具的颜色
     */
    getColor(name: string): string {
        const metadata = this.tools.get(name);
        return metadata?.color || 'blue';
    }
}

/**
 * 全局工具注册表实例
 */
export const ToolRegistry = new ToolRegistryClass();

/**
 * 预定义的工具元数据
 */
export const predefinedTools: ToolMetadata[] = [
    {
        name: 'terminal',
        displayName: 'Terminal',
        description: '执行终端命令',
        icon: '💻',
        color: 'green',
        requiresApproval: true,
    },
    {
        name: 'read_file',
        displayName: 'Read File',
        description: '读取文件内容',
        icon: '📄',
        color: 'blue',
        requiresApproval: false,
        paramDisplay: {
            format: {
                file_path: (value) => value,
            },
        },
    },
    {
        name: 'write_file',
        displayName: 'Write File',
        description: '写入文件',
        icon: '✏️',
        color: 'orange',
        requiresApproval: true,
    },
    {
        name: 'edit_file',
        displayName: 'Edit File',
        description: '编辑文件',
        icon: '📝',
        color: 'yellow',
        requiresApproval: true,
    },
    {
        name: 'glob_files',
        displayName: 'Glob Files',
        description: '搜索文件',
        icon: '🔍',
        color: 'purple',
        requiresApproval: false,
    },
    {
        name: 'ask_user_with_options',
        displayName: 'Ask User',
        description: '询问用户',
        icon: '❓',
        color: 'cyan',
        requiresApproval: true,
    },
    {
        name: 'todo_tool',
        displayName: 'Todo List',
        description: '任务管理',
        icon: '✅',
        color: 'green',
        requiresApproval: false,
    },
    {
        name: 'load_mcp_tools',
        displayName: 'Load MCP Tools',
        description: '加载 MCP 工具列表',
        icon: '🔌',
        color: 'blue',
        requiresApproval: false,
    },
    {
        name: 'execute_mcp_tool',
        displayName: 'Execute MCP Tool',
        description: '执行 MCP 工具',
        icon: '⚙️',
        color: 'green',
        requiresApproval: true,
    },
];

// 初始化注册表
ToolRegistry.registerAll(predefinedTools);

/**
 * Hook: 使用工具元数据
 */
export const useToolMetadata = (toolName: string) => {
    const metadata = React.useMemo(() => ToolRegistry.get(toolName), [toolName]);

    return {
        displayName: metadata?.displayName || toolName,
        icon: metadata?.icon || '🔧',
        color: metadata?.color || 'gray',
        requiresApproval: metadata?.requiresApproval ?? false,
        metadata,
    };
};
