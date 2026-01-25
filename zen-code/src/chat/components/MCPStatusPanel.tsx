import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { MCPManager } from '@codegraph/agent/src/mcp';
import { useChat } from '@langgraph-js/sdk/react';

interface MCPStatus {
	isInitialized: boolean;
	toolCount: number;
	lastRefresh: number | null;
	servers: string[];
}

/**
 * MCP 状态面板
 * 显示 MCP 服务器连接状态、工具数量、最后刷新时间
 */
export const MCPStatusPanel: React.FC = () => {
	const [status, setStatus] = useState<MCPStatus>({
		isInitialized: false,
		toolCount: 0,
		lastRefresh: null,
		servers: [],
	});
	const { loading } = useChat();

	useEffect(() => {
		const loadStatus = async () => {
			const status = await MCPManager.getInstance().getStatus();
			setStatus(status);
		};
		loadStatus();
	}, [loading]);

	return (
		<>
			{status.toolCount ? (
				<Box paddingX={1}>
					<Text color="green" bold>
						MCP
					</Text>
					<Text color="cyan"> {status.toolCount}</Text>
				</Box>
			) : (
				<></>
			)}
		</>
	);
};
