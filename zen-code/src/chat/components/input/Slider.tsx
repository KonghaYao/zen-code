import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

export interface SliderProps {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    defaultValue?: number;
    onChange?: (value: number) => void;
    label?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    size?: number;
    showValue?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
    min = 0,
    max = 100,
    step = 1,
    value: controlledValue,
    defaultValue = min,
    onChange,
    label,
    disabled = false,
    autoFocus = true,
    size = 30,
    showValue = true,
}) => {
    const { isFocused } = useFocus({ autoFocus });
    const [internalValue, setInternalValue] = useState(defaultValue);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const updateValue = (newValue: number) => {
        const clampedValue = Math.max(min, Math.min(max, newValue));
        const steppedValue = Math.round(clampedValue / step) * step;

        if (controlledValue === undefined) {
            setInternalValue(steppedValue);
        }
        onChange?.(steppedValue);
    };

    const percentage = ((value - min) / (max - min)) * 100;
    const position = Math.round((size * percentage) / 100);

    useInput(
        (input, key) => {
            if (disabled) return;

            if (key.leftArrow) {
                updateValue(value - step);
            } else if (key.rightArrow) {
                updateValue(value + step);
            } else if (key.ctrl && input === 'a') {
                updateValue(min);
            } else if (key.ctrl && input === 'e') {
                updateValue(max);
            }
        },
        { isActive: isFocused && !disabled },
    );

    const beforeThumb = '━'.repeat(position);
    const thumb = isFocused ? '●' : '○';
    const afterThumb = '━'.repeat(size - position);

    return (
        <Box flexDirection="column">
            {label && (
                <Box marginBottom={1}>
                    <Text color={isFocused && !disabled ? 'green' : 'gray'} bold={isFocused}>
                        {label}
                    </Text>
                </Box>
            )}
            <Box>
                <Text color={isFocused && !disabled ? 'green' : 'gray'}>{'<'}</Text>
                <Text color={isFocused && !disabled ? 'cyan' : 'white'}>
                    {beforeThumb}
                    <Text color={isFocused && !disabled ? 'yellow' : 'gray'}>{thumb}</Text>
                    {afterThumb}
                </Text>
                <Text color={isFocused && !disabled ? 'green' : 'gray'}>{'>'}</Text>
                {showValue && (
                    <Text color={isFocused && !disabled ? 'green' : 'gray'}> {value}</Text>
                )}
            </Box>
        </Box>
    );
};
