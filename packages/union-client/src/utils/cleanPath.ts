/**
 * cleanPath 工具函数
 * 清理路径，将绝对路径转换为相对路径（基于 cwd）
 */

export function cleanPath(path?: string): string | undefined {
  return path?.replace(process.cwd(), '.') || path || '';
}
