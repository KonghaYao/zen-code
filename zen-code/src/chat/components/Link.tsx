import React from 'react';
import { Text } from 'ink';
import { getColor } from '@codegraph/union-client';
import { cleanPath } from '@codegraph/union-client';

interface LinkProps {
    /** File path or URL to display */
    path: string | undefined;
    /** Optional color name from the color palette */
    color?: string;
    /** Optional line number to highlight */
    line?: number;
}

/**
 * Link component for displaying file paths and URLs in TUI
 * Supports color customization and path shortening
 */
const Link: React.FC<LinkProps> = ({ path, color = 'cyan', line }) => {
    const displayPath = cleanPath(path);
    const lineSuffix = line !== undefined ? `:${line}` : '';

    return (
        <Text color={getColor(color as any)}>
            {displayPath}
            {lineSuffix}
        </Text>
    );
};

export default Link;
