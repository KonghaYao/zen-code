import React from 'react';
import { Text } from 'ink';

export interface MarkdownProps {
    /** The markdown content to render */
    children: string;
    /** Optional text color */
    color?: string;
    /** Optional text dimming */
    dim?: boolean;
    /** Optional text bold */
    bold?: boolean;
    /** Optional text italic */
    italic?: boolean;
}

export const SimpleMarkdown: React.FC<MarkdownProps> = ({ children, color, dim, bold, italic }) => {
    const lines = children.split('\n').map((i) => (i === '' ? '\n' : i));

    return (
        <>
            {lines.map((chunk, chunkIndex) => (
                <Text key={chunkIndex} color={color} dimColor={dim} bold={bold} italic={italic}>
                    {chunk}
                </Text>
            ))}
        </>
    );
};
