/**
 * 统一面板系统 - 搜索栏组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from '../../../utils/use-input';
import type { SearchBarProps } from './types';
import { EnhancedTextInput } from '../input/EnhancedTextInput';

/**
 * 搜索栏组件
 */
export const SearchBar: React.FC<SearchBarProps> = ({
    searchTerm,
    onSearchTermChange,
    activeFilter,
    filters = [],
    onFilterChange,
    placeholder,
    filteredCount,
    totalCount,
}) => {
    // 处理搜索输入
    useInput((input, key) => {
        if (key.escape) {
            onSearchTermChange('');
        } else if (key.backspace || key.delete) {
            onSearchTermChange(searchTerm.slice(0, -1));
        } else if (input.length === 1 && !key.ctrl && !key.meta) {
            onSearchTermChange(searchTerm + input);
        }
    });

    return (
        <Box flexDirection="column" width="100%">
            {/* 搜索框 */}
            <Box gap={1} paddingX={1} width="100%">
                <Text color="cyan">/</Text>
                <EnhancedTextInput value={searchTerm} onChange={onSearchTermChange} placeholder={placeholder} />
                {searchTerm && (
                    <Text color="gray" dimColor>
                        ESC 清除
                    </Text>
                )}
            </Box>
        </Box>
    );
};
