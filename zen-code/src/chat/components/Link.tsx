import React from 'react';
import { Text } from 'ink';
import { getColor, PaletteColor } from '@codegraph/union-client';
import { cleanPath } from '@codegraph/union-client';

interface LinkProps {
    /** File path or URL to display */
    path: string | undefined;
    /** Optional color name from the color palette (used when rainbow is false) */
    color?: string;
    /** Optional line number to highlight */
    line?: number;
    /** Whether to color each path segment with a different stable color */
    rainbow?: boolean;
}

/**
 * Palette colors for alternating path segments
 */
const SEGMENT_COLORS: [PaletteColor, PaletteColor] = ['sky', 'primary'];

/**
 * Get color for a path segment based on alternating pattern
 */
function getSegmentColorByIndex(index: number): string {
    const colorIndex = index % 2;
    return getColor(SEGMENT_COLORS[colorIndex]);
}

/**
 * Parse a path into segments with separators
 * Returns array of { type: 'segment' | 'separator', value: string }
 */
function parsePathSegments(path: string): Array<{ type: 'segment' | 'separator'; value: string }> {
    const segments: Array<{ type: 'segment' | 'separator'; value: string }> = [];

    // Handle leading separator (e.g., "/" at start of absolute path)
    if (path.startsWith('/')) {
        segments.push({ type: 'separator', value: '/' });
        path = path.slice(1);
    }

    const parts = path.split('/');

    parts.forEach((part, index) => {
        if (part) {
            segments.push({ type: 'segment', value: part });
        }
        // Add separator after each part except the last empty one
        if (index < parts.length - 1) {
            segments.push({ type: 'separator', value: '/' });
        }
    });

    return segments;
}

/**
 * Link component for displaying file paths and URLs in TUI
 * Supports color customization, path shortening, and rainbow mode
 */
const Link: React.FC<LinkProps> = ({ path, color = 'cyan', line, rainbow = false }) => {
    const displayPath = cleanPath(path) ?? '';
    const lineSuffix = line !== undefined ? `:${line}` : '';

    // Non-rainbow mode: use single color
    if (!rainbow) {
        return (
            <Text color={getColor(color as PaletteColor)}>
                {displayPath}
                {lineSuffix}
            </Text>
        );
    }

    // Rainbow mode: color each segment by depth (creates gradient effect)
    const segments = parsePathSegments(displayPath);

    // Find the last segment index for highlighting
    let lastSegmentIndex = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].type === 'segment') {
            lastSegmentIndex = i;
            break;
        }
    }

    let segmentDepth = 0;

    return (
        <Text>
            {segments.map((seg, index) => {
                if (seg.type === 'separator') {
                    return (
                        <Text key={index} dimColor color="gray">
                            {seg.value}
                        </Text>
                    );
                }

                const isLast = index === lastSegmentIndex;
                const segmentColor = getSegmentColorByIndex(segmentDepth);
                segmentDepth++;

                return (
                    <Text key={index} color={segmentColor} dimColor={!isLast}>
                        {seg.value}
                    </Text>
                );
            })}
            {lineSuffix && <Text color="gray">{lineSuffix}</Text>}
        </Text>
    );
};

export default Link;
