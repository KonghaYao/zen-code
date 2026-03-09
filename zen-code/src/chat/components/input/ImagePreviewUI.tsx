import React from 'react';
import { Box, Text } from 'ink';
import type { AttachedImage } from './useImagePaste.js';

interface ImagePreviewUIProps {
    images: AttachedImage[];
    onRemove: (id: string) => void;
}

/**
 * Displays attached images as filename badges above the input box.
 * Shows: 📎 [image: paste_xxx.png] for each attached image.
 */
export const ImagePreviewUI: React.FC<ImagePreviewUIProps> = ({ images, onRemove: _ }) => {
    if (images.length === 0) return null;

    return (
        <Box flexDirection="row" flexWrap="wrap" paddingX={1} gap={1}>
            {images.map((img) => (
                <Box key={img.id}>
                    <Text color="cyan">📎 </Text>
                    <Text color="cyan" dimColor>
                        [{img.fileName}]
                    </Text>
                </Box>
            ))}
        </Box>
    );
};
