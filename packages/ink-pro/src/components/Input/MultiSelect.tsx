import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useFocus } from 'ink';
import { useInput } from '../../utils/useInput';

export interface MultiSelectOption {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface MultiSelectProps {
    options: MultiSelectOption[];
    values?: string[];
    defaultValues?: string[];
    onChange?: (values: string[]) => void;
    onSubmit?: (values: string[]) => void;
    disabled?: boolean;
    highlightText?: string;
    itemComponent?: React.ComponentType<{
        option: MultiSelectOption;
        isSelected: boolean;
        isHighlighted: boolean;
        isFocused: boolean;
        isComponentDisabled: boolean;
    }>;
    indicatorComponent?: React.ComponentType<{ isSelected: boolean }>;
    statusComponent?: React.ComponentType<{ values: string[] }>;
    autoFocus?: boolean;
    singleSelect?: boolean;
}

const DefaultItemComponent: React.FC<{
    option: MultiSelectOption;
    isSelected: boolean;
    isHighlighted: boolean;
    isFocused: boolean;
    isComponentDisabled: boolean;
}> = ({ option, isSelected, isHighlighted, isFocused, isComponentDisabled }) => {
    const isDimmed = !isFocused || isComponentDisabled;
    let color = 'white';

    if (option.disabled) {
        color = 'gray';
    } else if (isSelected) {
        color = isFocused ? 'green' : 'gray';
    } else if (isHighlighted && isFocused) {
        color = 'cyan';
    } else if (isDimmed) {
        color = 'gray';
    }

    return (
        <Box>
            <Text color={color}>
                {isSelected ? '◉ ' : '○ '}
                {option.label}
            </Text>
        </Box>
    );
};

const DefaultIndicatorComponent: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
    <Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '◉' : '○'}</Text>
);

const DefaultStatusComponent: React.FC<{ values: string[] }> = ({ values }) => <></>;

export const MultiSelectPro: React.FC<MultiSelectProps> = ({
    options,
    values,
    defaultValues = [],
    onChange,
    onSubmit,
    disabled = false,
    highlightText,
    itemComponent: ItemComponent = DefaultItemComponent,
    indicatorComponent: IndicatorComponent = DefaultIndicatorComponent,
    statusComponent: StatusComponent = DefaultStatusComponent,
    autoFocus = true,
    singleSelect = false,
}) => {
    const { isFocused } = useFocus({ autoFocus });
    const [selectedValues, setSelectedValues] = useState<string[]>(values || defaultValues);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

    // Update internal state when values prop changes
    useEffect(() => {
        if (values !== undefined) {
            setSelectedValues(values);
        }
    }, [values]);

    const toggleSelection = useCallback(
        (index: number) => {
            if (disabled || options[index].disabled) return;

            const option = options[index];
            let newValues: string[];

            if (singleSelect) {
                // Single select mode: only one selection at a time
                newValues = selectedValues.includes(option.value) ? [] : [option.value];
            } else {
                // Multi select mode: toggle selection
                newValues = selectedValues.includes(option.value)
                    ? selectedValues.filter((v) => v !== option.value)
                    : [...selectedValues, option.value];
            }

            setSelectedValues(newValues);
            onChange?.(newValues);
        },
        [selectedValues, options, disabled, onChange, singleSelect],
    );
    const handleSubmit = useCallback(() => {
        if (disabled) return;

        if (selectedValues.length === 0 && options.length > 0) {
            const hoveredOption = options[highlightedIndex];
            if (hoveredOption && !hoveredOption.disabled) {
                onChange?.([hoveredOption.value]);
                onSubmit?.([hoveredOption.value]);
                return;
            }
        }

        onSubmit?.(selectedValues);
    }, [selectedValues, disabled, onSubmit, options, highlightedIndex]);

    useInput((input, key) => {
        if (!isFocused || disabled) return;

        if (key.upArrow) {
            setHighlightedIndex((prev) => Math.max(0, prev - 1));
        } else if (key.downArrow) {
            setHighlightedIndex((prev) => Math.min(options.length - 1, prev + 1));
        } else if (key.return) {
            handleSubmit();
        } else if (input === ' ') {
            toggleSelection(highlightedIndex);
        }
    });

    const filteredOptions = highlightText
        ? options.filter(
              (option) =>
                  option.label.toLowerCase().includes(highlightText.toLowerCase()) ||
                  option.value.toLowerCase().includes(highlightText.toLowerCase()),
          )
        : options;

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <StatusComponent values={selectedValues} />
            </Box>
            <Box flexDirection="column">
                {filteredOptions.map((option, index) => {
                    const isSelected = selectedValues.includes(option.value);
                    const isHighlighted = index === highlightedIndex;
                    return (
                        <Box key={option.value}>
                            <ItemComponent
                                option={option}
                                isSelected={isSelected}
                                isHighlighted={isHighlighted}
                                isFocused={isFocused}
                                isComponentDisabled={disabled}
                            />
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};
