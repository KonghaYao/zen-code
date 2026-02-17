/**
 * Setting Field 组件 - 简洁布局
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { SettingFieldProps } from './types';

const ToggleField: React.FC<SettingFieldProps> = ({ field, value, isFocused }) => (
    <Box flexDirection="row">
        <Text bold={isFocused} color={isFocused ? 'cyan' : undefined}>
            {field.label}
        </Text>
        <Text dimColor>: </Text>
        <Text color={value ? 'green' : 'gray'} bold={isFocused}>
            {value ? 'ON' : 'OFF'}
        </Text>
    </Box>
);

const NumberField: React.FC<SettingFieldProps> = ({ field, value, isFocused }) => (
    <Box flexDirection="row">
        <Text bold={isFocused} color={isFocused ? 'cyan' : undefined}>
            {field.label}
        </Text>
        <Text dimColor>: </Text>
        <Text color={isFocused ? 'yellow' : undefined} bold={isFocused}>
            {value ?? field.min ?? 0}
        </Text>
        <Text dimColor> ms</Text>
    </Box>
);

const SelectField: React.FC<SettingFieldProps> = ({ field, value, isFocused }) => {
    const current = field.options?.find((o) => o.value === value);
    return (
        <Box flexDirection="row">
            <Text bold={isFocused} color={isFocused ? 'cyan' : undefined}>
                {field.label}
            </Text>
            <Text dimColor>: </Text>
            <Text color={isFocused ? 'yellow' : undefined} bold={isFocused}>
                {current?.label || value}
            </Text>
        </Box>
    );
};

const InputField: React.FC<SettingFieldProps> = ({ field, value, isFocused }) => (
    <Box flexDirection="row">
        <Text bold={isFocused} color={isFocused ? 'cyan' : undefined}>
            {field.label}
        </Text>
        <Text dimColor>: </Text>
        <Text color={isFocused ? 'yellow' : 'gray'} bold={isFocused}>
            {value || field.placeholder || '-'}
        </Text>
    </Box>
);

const SettingField: React.FC<SettingFieldProps> = (props) => {
    switch (props.field.type) {
        case 'toggle':
            return <ToggleField {...props} />;
        case 'number':
            return <NumberField {...props} />;
        case 'select':
            return <SelectField {...props} />;
        case 'input':
            return <InputField {...props} />;
        default:
            return <Text color="red">Unknown</Text>;
    }
};

export default SettingField;
