/**
 * DesktopWallpaper 组件
 * macOS 风格桌面壁纸，使用 Tailwind CSS
 */

import { motion } from 'motion/react';

interface DesktopWallpaperProps {
    imagePath?: string;
    blur?: boolean;
}

const DEFAULT_WALLPAPER = 'https://www.macos-web.app/assets/ventura-5-Ddip4tdG.webp';

export function DesktopWallpaper({ imagePath = DEFAULT_WALLPAPER, blur = false }: DesktopWallpaperProps) {
    return (
        <motion.div
            className={`fixed inset-0 -z-10 bg-cover bg-center ${blur ? 'blur-xl scale-110' : ''}`}
            style={{ backgroundImage: `url(${imagePath})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        />
    );
}

export default DesktopWallpaper;
