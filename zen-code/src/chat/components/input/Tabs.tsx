import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

export interface TabItem {
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
}

export interface TabsProps {
    items: TabItem[];
    defaultIndex?: number;
    onChange?: (index: number, item: TabItem) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    variant?: 'line' | 'enclosed' | 'soft-rounded';
}

export const Tabs: React.FC<TabsProps> = ({
    items,
    defaultIndex = 0,
    onChange,
    disabled = false,
    autoFocus = true,
    variant = 'line',
}) => {
    const { isFocused } = useFocus({ autoFocus });
    const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

    const handleTabChange = useCallback(
        (index: number) => {
            if (index < 0 || index >= items.length || items[index].disabled) return;

            setSelectedIndex(index);
            onChange?.(index, items[index]);
        },
        [items, onChange],
    );

    useInput(
        (input, key) => {
            if (disabled) return;

            if (key.leftArrow) {
                handleTabChange(selectedIndex - 1);
            } else if (key.rightArrow) {
                handleTabChange(selectedIndex + 1);
            }
        },
        { isActive: isFocused && !disabled },
    );

    const renderTabs = () => {
        return items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isTabFocused = isFocused && !disabled;

            let tabStyle: React.ReactNode;

            if (variant === 'line') {
                // Line variant: underline the active tab
                tabStyle = (
                    <Box key={item.id} marginRight={1}>
                        <Text
                            color={item.disabled ? 'gray' : isSelected ? (isTabFocused ? 'green' : 'cyan') : 'gray'}
                            bold={isSelected && isTabFocused}
                        >
                            {item.label}
                        </Text>
                        {isSelected && <Text color={isTabFocused ? 'green' : 'cyan'}>{'_'}</Text>}
                    </Box>
                );
            } else if (variant === 'enclosed') {
                // Enclosed variant: box around active tab
                const left = index === 0 || isSelected ? '┌' : '─';
                const right = index === items.length - 1 || isSelected ? '┐' : '─';
                const bottomLeft = index === 0 || isSelected ? '│' : ' ';
                const bottomRight = index === items.length - 1 || isSelected ? '│' : ' ';
                const bottom = isSelected ? '─' : ' ';

                const padding = isSelected ? ' ' : '';
                const color = item.disabled ? 'gray' : isSelected ? (isTabFocused ? 'green' : 'cyan') : 'gray';

                tabStyle = (
                    <Box key={item.id}>
                        <Box flexDirection="column">
                            <Box>
                                <Text color={color}>{left}</Text>
                                <Text color={color} bold={isSelected && isTabFocused}>
                                    {padding}
                                    {item.label}
                                    {padding}
                                </Text>
                                <Text color={color}>{right}</Text>
                            </Box>
                            {isSelected && (
                                <Box>
                                    <Text color={color}>{bottomLeft}</Text>
                                    <Text color={color}>{bottom.repeat(item.label.length + 2)}</Text>
                                    <Text color={color}>{bottomRight}</Text>
                                </Box>
                            )}
                        </Box>
                    </Box>
                );
            } else {
                // Soft-rounded variant: subtle styling
                const symbol = isSelected ? '●' : '○';
                tabStyle = (
                    <Box key={item.id} marginRight={2}>
                        <Text
                            color={item.disabled ? 'gray' : isSelected ? (isTabFocused ? 'green' : 'cyan') : 'gray'}
                            bold={isSelected && isTabFocused}
                        >
                            {symbol} {item.label}
                        </Text>
                    </Box>
                );
            }

            return tabStyle;
        });
    };

    const renderContent = () => {
        const selectedItem = items[selectedIndex];
        if (!selectedItem?.content) return null;

        return (
            <Box
                marginTop={1}
                paddingX={2}
                paddingY={1}
                borderStyle="round"
                borderColor={isFocused && !disabled ? 'gray' : 'gray'}
                flexDirection="column"
            >
                {selectedItem.content}
            </Box>
        );
    };

    return (
        <Box flexDirection="column" flexGrow={1}>
            <Box>{renderTabs()}</Box>

            {items.some((item) => item.content) && renderContent()}
        </Box>
    );
};
