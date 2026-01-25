/**
 * 统一面板系统 - 搜索栏组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { SearchBarProps } from './types';
import { EnhancedTextInput } from '../input/EnhancedTextInput';

/**
 * 搜索栏组件
 */
export const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchTermChange, placeholder }) => {
    return (
        <Box flexDirection="column" width="100%">
            {/* 搜索框 */}
            <Box gap={1} paddingX={1} width="100%">
                <Text color="cyan">/</Text>
                <EnhancedTextInput value={searchTerm} onChange={onSearchTermChange} placeholder={placeholder} />
            </Box>
        </Box>
    );
};
