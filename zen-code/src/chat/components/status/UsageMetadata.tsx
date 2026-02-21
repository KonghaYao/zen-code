import React from 'react';
import { Box, Text } from 'ink';

interface UsageMetadataProps {
    usage_metadata: Partial<{
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: any;
        completion_tokens_details?: any;
    }>;
    response_metadata?: {
        model_name?: string;
    };
    spend_time?: number;
    tool_call_id?: string;
    id?: string;
}

const formatTokens = (tokens: number | undefined) => {
    return (tokens || 0).toString();
};

export const UsageMetadata: React.FC<UsageMetadataProps> = ({
    usage_metadata,
    spend_time,
    response_metadata,
    id,
    tool_call_id,
}) => {
    if (!usage_metadata && !spend_time && !response_metadata && !id && !tool_call_id) {
        return null;
    }

    // Normalize numeric values to avoid NaN rendering
    const outputTokens = Number(usage_metadata?.output_tokens ?? 0);
    const inputTokens = Number(usage_metadata?.input_tokens ?? 0);
    const totalTokens = Number(usage_metadata?.total_tokens ?? 0);

    const spendSecondsRaw = Number(spend_time) / 1000;
    const spendSeconds = Number.isFinite(spendSecondsRaw) ? spendSecondsRaw : 0;

    const speed = spendSeconds > 0 && Number.isFinite(outputTokens) ? outputTokens / spendSeconds : 0;

    return (
        <Box marginTop={0} flexGrow={1} justifyContent="flex-end" paddingLeft={1}>
            <Box gap={1}>
                {(totalTokens > 0 || inputTokens > 0 || outputTokens > 0) && (
                    <Text dimColor>
                        <Text color="white">Tokens:</Text>
                        <Text color="green">{formatTokens(inputTokens)}</Text>
                        <Text color="white">/</Text>
                        <Text color="red">{formatTokens(outputTokens)}</Text>
                    </Text>
                )}
                {spendSeconds > 0 && (
                    <Text dimColor>
                        <Text color="white">Time:</Text>
                        <Text color="yellow">{spendSeconds.toFixed(0)}s</Text>
                    </Text>
                )}
                {speed > 0 && (
                    <Text dimColor>
                        <Text color="white">Speed:</Text>
                        <Text color="cyan">{speed.toFixed(2)} t/s</Text>
                    </Text>
                )}
                {response_metadata?.model_name && (
                    <Text>
                        <Text color="white">Model:</Text>
                        <Text color="blue">{response_metadata.model_name}</Text>
                    </Text>
                )}
            </Box>
        </Box>
    );
};
