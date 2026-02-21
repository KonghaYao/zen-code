/**
 * MCP 配置面板 - 管理 MCP 服务器配置
 *
 * 功能：
 * - 查看 MCP 服务器列表
 * - 新增/编辑/删除 MCP 服务器
 * - JSON 格式配置编辑
 * - 测试服务器连接
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Spacer, Text } from 'ink';
import { useInput } from 'ink-pro';
import { useSettings } from '../../../context/SettingsContext';
import type { MCPConfig } from '@codegraph/config';
import McpJsonEditor from '../../forms/McpJsonEditor';
import { useMcpConfig } from '../../../hooks/useMcpConfig';

interface McpPanelProps {
    onClose: () => void;
}

interface TestResult {
    success: boolean;
    message: string;
    tools?: string[];
}

const McpPanel: React.FC<McpPanelProps> = ({ onClose }) => {
    const { config, updateConfig } = useSettings();

    // MCP 配置 hook
    const mcpConfigRaw: MCPConfig = config?.mcp_config || {};
    const { mcpConfig, updateMcpConfig } = useMcpConfig({
        mcpConfig: mcpConfigRaw,
        updateConfig,
    });

    // 视图状态: 'list' | 'json' | 'test'
    const [view, setView] = useState<'list' | 'json' | 'test'>('list');
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
    const [editingServer, setEditingServer] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [testingServer, setTestingServer] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    // 服务器名称列表
    const serverNames = Object.keys(mcpConfig);

    // 当前选中的服务器
    const selectedServerName = serverNames[selectedIndex];
    const selectedServerConfig = selectedServerName ? mcpConfig[selectedServerName] : null;

    // 显示消息后自动清除
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // 判断服务器类型
    const getServerType = useCallback((config: any): 'stdio' | 'SSE' | 'unknown' => {
        if (config.command) return 'stdio';
        if (config.url) return 'SSE';
        return 'unknown';
    }, []);

    // 进入新增表单
    const goToAddForm = useCallback(() => {
        setEditMode('add');
        setEditingServer(null);
        setView('json');
        setMessage(null);
    }, []);

    // 进入编辑表单
    const goToEditForm = useCallback(() => {
        if (!selectedServerName || !selectedServerConfig) return;
        setEditMode('edit');
        setEditingServer(selectedServerName);
        setView('json');
        setMessage(null);
    }, [selectedServerName, selectedServerConfig]);

    // 进入测试视图
    const goToTestView = useCallback(async () => {
        if (!selectedServerName || !selectedServerConfig) return;

        setTestingServer(selectedServerName);
        setTestResult(null);
        setView('test');

        try {
            // 尝试验证配置格式
            const hasStdio = !!(selectedServerConfig.command && selectedServerConfig.args);
            const hasSSE = !!selectedServerConfig.url;

            if (!hasStdio && !hasSSE) {
                setTestResult({
                    success: false,
                    message: '配置无效：必须包含 command (stdio) 或 url (SSE)',
                });
                return;
            }

            // 验证参数
            if (hasStdio && (!selectedServerConfig.command || !Array.isArray(selectedServerConfig.args))) {
                setTestResult({
                    success: false,
                    message: '配置无效：stdio 模式需要 command 和 args 字段',
                });
                return;
            }

            // TODO: 实际连接测试需要在后端完成
            // TUI 客户端无法直接执行 stdio 命令
            // 暂时返回配置验证结果
            const type = hasSSE ? 'SSE' : 'stdio';
            setTestResult({
                success: true,
                message: `配置格式验证通过 (${type} 模式)`,
                tools: [],
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    }, [selectedServerName, selectedServerConfig]);

    // 返回列表
    const goToList = useCallback(() => {
        setView('list');
        setEditingServer(null);
        setTestResult(null);
        setMessage(null);
    }, []);

    // 保存 MCP 配置（新增或编辑）
    const handleSaveConfig = useCallback(
        async (serverName: string, serverConfig: any) => {
            const newConfig = { ...mcpConfig };
            newConfig[serverName] = serverConfig;

            await updateMcpConfig(newConfig);

            setMessage(editMode === 'add' ? `已添加服务器: ${serverName}` : `已更新服务器: ${serverName}`);

            // 新增时选中新服务器
            if (editMode === 'add') {
                const newIndex = Object.keys(newConfig).findIndex((name) => name === serverName);
                setSelectedIndex(newIndex >= 0 ? newIndex : 0);
            }

            goToList();
        },
        [editMode, mcpConfig, updateMcpConfig, goToList],
    );

    // 删除服务器
    const handleDeleteServer = useCallback(async () => {
        if (!selectedServerName) return;

        const newConfig = { ...mcpConfig };
        delete newConfig[selectedServerName];

        await updateMcpConfig(newConfig);

        const newIndex = Math.min(selectedIndex, Object.keys(newConfig).length - 1);
        setSelectedIndex(newIndex >= 0 ? newIndex : 0);
        setMessage(`已删除服务器: ${selectedServerName}`);
    }, [selectedServerName, selectedIndex, mcpConfig, updateMcpConfig]);

    // 键盘快捷键
    useInput(
        (input, key) => {
            if (view === 'json' || view === 'test') {
                if (key.escape) {
                    goToList();
                }
                return;
            }

            // 列表视图快捷键
            if (key.upArrow) {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : serverNames.length - 1));
            } else if (key.downArrow) {
                setSelectedIndex((prev) => (prev < serverNames.length - 1 ? prev + 1 : 0));
            } else if (input === 'n' || input === 'N') {
                goToAddForm();
            } else if ((input === 'e' || input === 'E' || key.return) && selectedServerName) {
                goToEditForm();
            } else if ((input === 'd' || input === 'D') && selectedServerName) {
                handleDeleteServer();
            } else if ((input === 't' || input === 'T') && selectedServerName) {
                goToTestView();
            } else if (key.escape) {
                onClose();
            }
        },
        { isActive: true },
    );

    // 渲染列表视图
    const renderListView = useMemo(() => {
        if (serverNames.length === 0) {
            return (
                <Box paddingX={2} paddingY={1}>
                    <Text color="yellow">未配置任何 MCP 服务器</Text>
                    <Box marginTop={1}>
                        <Text color="gray" dimColor>
                            按 <Text color="cyan">n</Text> 添加新服务器
                        </Text>
                    </Box>
                </Box>
            );
        }

        return (
            <Box flexDirection="column" paddingX={2} gap={1}>
                {serverNames.map((serverName, index) => {
                    const config = mcpConfig[serverName];
                    const serverType = getServerType(config);
                    const typeColor = serverType === 'stdio' ? 'green' : serverType === 'SSE' ? 'blue' : 'yellow';

                    return (
                        <Box key={`server-${index}-${serverName}`} marginBottom={0} gap={1}>
                            <Text color={index === selectedIndex ? 'cyan' : 'gray'} bold={index === selectedIndex}>
                                {index === selectedIndex ? '>' : ' '}
                            </Text>
                            <Text bold={index === selectedIndex} color={index === selectedIndex ? 'cyan' : undefined}>
                                {serverName}
                            </Text>
                            <Spacer></Spacer>
                            <Text color={typeColor} dimColor={index !== selectedIndex}>
                                [{serverType.toUpperCase()}]
                            </Text>
                        </Box>
                    );
                })}

                <Box marginTop={1}>
                    <Text color="gray" dimColor>
                        <Text color="cyan">↑↓</Text> 导航 <Text color="cyan">n</Text> 新增 <Text color="cyan">e</Text>{' '}
                        编辑 <Text color="cyan">d</Text> 删除 <Text color="cyan">t</Text> 测试{' '}
                        <Text color="cyan">Esc</Text> 关闭
                    </Text>
                </Box>
            </Box>
        );
    }, [serverNames, mcpConfig, selectedIndex, getServerType]);

    // 渲染测试结果视图
    const renderTestView = useMemo(() => {
        if (!testingServer || !testResult) {
            return (
                <Box paddingX={2} paddingY={1}>
                    <Text color="yellow">正在验证配置...</Text>
                </Box>
            );
        }

        if (testResult.success) {
            return (
                <Box flexDirection="column" paddingX={2} gap={1}>
                    <Box>
                        <Text color="green">✓ {testResult.message}</Text>
                    </Box>
                    {testResult.tools && testResult.tools.length > 0 && (
                        <Box flexDirection="column" marginTop={1}>
                            <Text color="gray">发现 {testResult.tools.length} 个工具:</Text>
                            {testResult.tools.slice(0, 10).map((tool) => (
                                <Box key={tool} paddingLeft={2}>
                                    <Text color="gray">- {tool}</Text>
                                </Box>
                            ))}
                            {testResult.tools.length > 10 && (
                                <Box paddingLeft={2}>
                                    <Text color="gray">... 还有 {testResult.tools.length - 10} 个工具</Text>
                                </Box>
                            )}
                        </Box>
                    )}
                    <Box marginTop={1}>
                        <Text color="gray" dimColor>
                            按 <Text color="cyan">Enter</Text> 关闭
                        </Text>
                    </Box>
                </Box>
            );
        } else {
            return (
                <Box flexDirection="column" paddingX={2} gap={1}>
                    <Box>
                        <Text color="red">✗ 验证失败</Text>
                    </Box>
                    <Box>
                        <Text color="yellow">{testResult.message}</Text>
                    </Box>
                    <Box marginTop={1}>
                        <Text color="gray">建议检查:</Text>
                        <Text color="gray">- 配置格式是否正确</Text>
                        <Text color="gray">- 命令是否已安装（stdio 模式）</Text>
                        <Text color="gray">- URL 是否可访问（SSE 模式）</Text>
                    </Box>
                    <Box marginTop={1}>
                        <Text color="gray" dimColor>
                            按 <Text color="cyan">Enter</Text> 关闭
                        </Text>
                    </Box>
                </Box>
            );
        }
    }, [testingServer, testResult]);

    useInput(
        (input, key) => {
            if (view === 'test' && key.return) {
                goToList();
            }
        },
        { isActive: view === 'test' },
    );

    // 渲染当前视图
    return (
        <Box flexDirection="column">
            <Box paddingX={2} paddingY={1}>
                <Text bold color="cyan">
                    MCP Servers
                </Text>
            </Box>

            {view === 'list' ? (
                renderListView
            ) : view === 'json' ? (
                <McpJsonEditor
                    mode={editMode}
                    serverName={editingServer || undefined}
                    serverConfig={selectedServerConfig || undefined}
                    onCancel={goToList}
                    onSave={handleSaveConfig}
                />
            ) : (
                renderTestView
            )}

            {/* 消息提示 */}
            {message && (
                <Box paddingX={2} paddingY={0}>
                    <Text color="green">{message}</Text>
                </Box>
            )}
        </Box>
    );
};

export default McpPanel;
