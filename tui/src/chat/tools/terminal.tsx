import { createUITool, ToolManager, ToolRenderData } from '@langgraph-js/sdk';
import { Box, Text } from 'ink';
import { useState, useEffect, useRef } from 'react';
import { InputPreviewer } from '../components/MessageTool';
import { LimitedOutput } from '../components/LimitedOutput';
import { useApproval } from '../context/ApprovalContext';
import { ApprovalRequest } from '../components/GlobalApprovalPanel/types';

/**
 * 扩展的审批请求类型，包含工具引用
 */
interface ToolApprovalRequest extends Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'> {
    tool: ToolRenderData<Record<string, never>, any>;
}

// 创建一个内部组件来使用 hooks
const TerminalContent: React.FC<{ tool: ToolRenderData<Record<string, never>, any> }> = ({ tool }) => {
    const { addApprovalRequest } = useApproval();
    const [submitted, setSubmitted] = useState(false);
    const submittedRef = useRef(false);
    const addApprovalRequestRef = useRef(addApprovalRequest);

    // 保持 ref 同步
    useEffect(() => {
        addApprovalRequestRef.current = addApprovalRequest;
    }, [addApprovalRequest]);

    // 获取审批配置
    const interrupt = tool.getHumanInTheLoopData();

    // 当有审批配置时，自动添加到全局审批队列（只添加一次）
    useEffect(() => {
        if (interrupt?.reviewConfig && !submittedRef.current) {
            submittedRef.current = true;
            setSubmitted(true);

            // 获取消息索引和描述
            const description = tool.getInputRepaired()?.description;

            // 使用 ref 避免依赖变化导致重复执行
            const request: ToolApprovalRequest = {
                toolCall: {
                    name: tool.message.name!,
                    args: tool.getInputRepaired(),
                },
                tool,
                messageIndex: undefined,
                description,
            };
            addApprovalRequestRef.current(request);
        }
    }, [interrupt, tool]); // 移除 addApprovalRequest 依赖

    if (interrupt?.reviewConfig && submitted) {
        return (
            <Box flexDirection="column">
                <Box paddingX={1}>
                    <InputPreviewer content={tool.getInputRepaired()} />
                </Box>
                <Box paddingX={1} paddingY={1}>
                    <Text color="yellow">
                        ⏳ Wait for Approval
                    </Text>
                </Box>
            </Box>
        );
    }

    // 渲染输出（如果有）
    const renderOutput = () => {
        if (!tool.output) return null;
        return <LimitedOutput content={tool.output} maxLines={10} borderColor="cyan" />;
    };

    return (
        <Box flexDirection="column">
            <Box paddingX={1}>
                <InputPreviewer content={tool.getInputRepaired()} />
            </Box>
            {/* Output */}
            {renderOutput()}
        </Box>
    );
};

export const terminal = createUITool({
    name: 'terminal',
    description: '',
    parameters: {},
    handler: ToolManager.waitForUIDone,
    render(tool) {
        return <TerminalContent tool={tool} />;
    },
});
