import { useCallback } from 'react';
import clipboard from 'clipboardy';
import path from 'node:path';

export interface AttachedImage {
    id: string;
    filePath: string;
    fileName: string;
}

const MAX_IMAGES = 5;

/**
 * Hook for handling image paste from clipboard (Ctrl+V).
 * Uses clipboardy's hasImages() / readImages() APIs.
 * Requires bun patch on run-jxa to fix execa@9 named-export compatibility.
 */
export function useImagePaste(options: {
    attachedImages: AttachedImage[];
    onImagesChange: (images: AttachedImage[]) => void;
}) {
    const { attachedImages, onImagesChange } = options;

    const handlePaste = useCallback(async (): Promise<boolean> => {
        try {
            const hasImage = await clipboard.hasImages();
            if (!hasImage) return false;

            if (attachedImages.length >= MAX_IMAGES) return true;

            const filePaths = await clipboard.readImages();
            if (!filePaths || filePaths.length === 0) return false;

            const newImages: AttachedImage[] = filePaths.map((filePath) => ({
                id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                filePath,
                fileName: path.basename(filePath),
            }));

            onImagesChange([...attachedImages, ...newImages].slice(0, MAX_IMAGES));
            return true;
        } catch {
            return false;
        }
    }, [attachedImages, onImagesChange]);

    const removeImage = useCallback(
        (id: string) => {
            onImagesChange(attachedImages.filter((img) => img.id !== id));
        },
        [attachedImages, onImagesChange],
    );

    const clearImages = useCallback(() => {
        onImagesChange([]);
    }, [onImagesChange]);

    return { handlePaste, removeImage, clearImages };
}
