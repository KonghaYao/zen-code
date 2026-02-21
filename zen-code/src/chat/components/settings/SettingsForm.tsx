/**
 * Settings Form 组件 - 简洁布局
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink-pro';
import type { SettingsFormProps, SettingField as SettingFieldType } from './types';
import SettingField from './SettingField';
import { getGroupsByTab } from './schema';

function getDefaultValue(field: SettingFieldType): any {
    switch (field.type) {
        case 'toggle':
            return false;
        case 'number':
            return field.min ?? 0;
        case 'select':
            return field.options?.[0]?.value;
        case 'input':
            return '';
        default:
            return undefined;
    }
}

const SettingsForm: React.FC<SettingsFormProps> = ({ schema, config, onUpdate, activeTab = 'General' }) => {
    const groups = useMemo(() => getGroupsByTab(activeTab), [activeTab]);
    const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const focusedField = allFields[focusedIndex];

    const handleUpdate = useCallback(
        (field: SettingFieldType, value: any) => {
            onUpdate(field.key, value);
        },
        [onUpdate],
    );

    const toggleValue = useCallback(
        (field: SettingFieldType) => {
            handleUpdate(field, !config[field.key]);
        },
        [config, handleUpdate],
    );

    const adjustNumber = useCallback(
        (field: SettingFieldType, delta: number) => {
            const current = (config[field.key] as number) ?? getDefaultValue(field);
            const step = field.step || 1;
            const min = field.min ?? -Infinity;
            const max = field.max ?? Infinity;
            handleUpdate(field, Math.max(min, Math.min(max, current + delta * step)));
        },
        [config, handleUpdate],
    );

    const cycleSelect = useCallback(
        (field: SettingFieldType, dir: 1 | -1) => {
            const opts = field.options || [];
            if (!opts.length) return;
            const idx = opts.findIndex((o) => o.value === config[field.key]);
            const next = (idx + dir + opts.length) % opts.length;
            handleUpdate(field, opts[next].value);
        },
        [config, handleUpdate],
    );

    useInput(
        (input, key) => {
            if (key.upArrow) setFocusedIndex((p) => Math.max(0, p - 1));
            else if (key.downArrow) setFocusedIndex((p) => Math.min(allFields.length - 1, p + 1));
            else if (key.leftArrow || key.rightArrow) {
                const delta = key.leftArrow ? -1 : 1;
                if (focusedField?.type === 'toggle') toggleValue(focusedField);
                else if (focusedField?.type === 'number') adjustNumber(focusedField, delta);
                else if (focusedField?.type === 'select') cycleSelect(focusedField, delta);
            }
        },
        { isActive: true },
    );

    let fieldIdx = 0;

    return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
            {groups.map((group) => (
                <Box key={group.id} flexDirection="column" marginBottom={1}>
                    <Text bold color="gray">
                        [{group.label}]
                    </Text>
                    {group.fields.map((field) => {
                        const idx = fieldIdx++;
                        const focused = idx === focusedIndex;
                        return (
                            <Box key={field.key} flexDirection="column">
                                <SettingField
                                    field={field}
                                    value={config[field.key]}
                                    onChange={(v) => handleUpdate(field, v)}
                                    isFocused={focused}
                                />
                                {focused && field.help && (
                                    <Text dimColor color="yellow">
                                        {' '}
                                        → {field.help}
                                    </Text>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            ))}

            <Box marginTop={1}>
                <Text dimColor>↑↓ 导航 | ←→ 修改</Text>
            </Box>
        </Box>
    );
};

export default SettingsForm;
