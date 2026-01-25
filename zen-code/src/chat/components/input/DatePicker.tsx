import React, { useState } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

export interface DatePickerProps {
    label?: string;
    value?: Date;
    defaultValue?: Date;
    onChange?: (date: Date) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    format?: 'short' | 'long';
    minDate?: Date;
    maxDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    label,
    value: controlledValue,
    defaultValue = new Date(),
    onChange,
    disabled = false,
    autoFocus = true,
    format = 'short',
    minDate,
    maxDate,
}) => {
    const { isFocused } = useFocus({ autoFocus });
    const [internalDate, setInternalDate] = useState(defaultValue);
    const [editMode, setEditMode] = useState<'year' | 'month' | 'day' | null>(null);

    const date = controlledValue || internalDate;

    const updateDate = (newDate: Date) => {
        if (minDate && newDate < minDate) return;
        if (maxDate && newDate > maxDate) return;

        if (!controlledValue) {
            setInternalDate(newDate);
        }
        onChange?.(newDate);
    };

    const adjustDate = (amount: number, unit: 'year' | 'month' | 'day') => {
        const newDate = new Date(date);
        if (unit === 'year') {
            newDate.setFullYear(newDate.getFullYear() + amount);
        } else if (unit === 'month') {
            newDate.setMonth(newDate.getMonth() + amount);
        } else if (unit === 'day') {
            newDate.setDate(newDate.getDate() + amount);
        }
        updateDate(newDate);
    };

    useInput(
        (input, key) => {
            if (disabled) return;

            if (key.leftArrow) {
                if (editMode === 'year') adjustDate(-1, 'year');
                else if (editMode === 'month') adjustDate(-1, 'month');
                else if (editMode === 'day') adjustDate(-1, 'day');
                else setEditMode('day');
            } else if (key.rightArrow) {
                if (editMode === 'year') adjustDate(1, 'year');
                else if (editMode === 'month') adjustDate(1, 'month');
                else if (editMode === 'day') adjustDate(1, 'day');
                else setEditMode('day');
            } else if (key.upArrow) {
                adjustDate(1, editMode || 'day');
            } else if (key.downArrow) {
                adjustDate(-1, editMode || 'day');
            } else if (key.tab) {
                const modes: Array<'year' | 'month' | 'day' | null> = ['day', 'month', 'year', null];
                const currentIndex = modes.indexOf(editMode);
                setEditMode(modes[(currentIndex + 1) % modes.length]);
            }
        },
        { isActive: isFocused && !disabled },
    );

    const highlightField = (field: 'year' | 'month' | 'day') => {
        return editMode === field ? (isFocused ? 'cyan' : 'white') : 'white';
    };

    return (
        <Box flexDirection="column">
            {label && (
                <Box marginBottom={1}>
                    <Text color={isFocused && !disabled ? 'green' : 'gray'} bold>
                        {label}
                    </Text>
                </Box>
            )}
            <Box>
                <Text color={isFocused && !disabled ? 'green' : 'gray'}>
                    {'< '}

                    <Text color={highlightField('month')} bold={editMode === 'month'}>
                        {String(date.getMonth() + 1).padStart(2, '0')}
                    </Text>

                    <Text>{'/'}</Text>

                    <Text color={highlightField('day')} bold={editMode === 'day'}>
                        {String(date.getDate()).padStart(2, '0')}
                    </Text>

                    <Text>{'/'}</Text>

                    <Text color={highlightField('year')} bold={editMode === 'year'}>
                        {date.getFullYear()}
                    </Text>

                    {' >'}
                </Text>
            </Box>
            {!editMode && isFocused && (
                <Box marginTop={1}>
                    <Text dimColor color="gray">
                        Use arrow keys to navigate, Tab to switch fields
                    </Text>
                </Box>
            )}
        </Box>
    );
};
