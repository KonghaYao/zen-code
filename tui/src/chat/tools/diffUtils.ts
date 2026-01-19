import { diff_match_patch, Diff } from 'diff-match-patch';

/**
 * 生成 diff 结果，返回格式化的行级 diff
 */
export function generateDiff(oldText: string, newText: string): string {
    if (oldText === newText) {
        return 'No changes';
    }

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    return formatDiffs(diffs);
}

/**
 * 格式化 diff 数组为可读的字符串
 */
function formatDiffs(diffs: Diff[]): string {
    let result = '';
    let lineBuffer: string[] = [];
    let currentLine = 1;

    for (const [operation, text] of diffs) {
        // 0: 平衡, 1: 删除, -1: 插入
        if (operation === 0) {
            // 未变化的文本
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (i === lines.length - 1 && lines[i] === '') {
                    // 最后一个空行（由于 split）
                    continue;
                }
                if (i === 0 && lineBuffer.length > 0) {
                    lineBuffer.push(lines[i]);
                    if (i === lines.length - 1) {
                        result += `  ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                } else {
                    if (i > 0 && lineBuffer.length > 0) {
                        result += `  ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                    if (i === lines.length - 1 && text.endsWith('\n')) {
                        // 最后一行后面有换行，但不是最后一个字符
                        result += `  ${lines[i]}\n`;
                    } else if (i < lines.length - 1) {
                        result += `  ${lines[i]}\n`;
                    } else if (i === lines.length - 1 && lines[i] !== '') {
                        lineBuffer.push(lines[i]);
                    }
                }
            }
        } else if (operation === -1) {
            // 插入的文本（新内容）
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (i === lines.length - 1 && lines[i] === '') {
                    continue;
                }
                if (i === 0 && lineBuffer.length > 0) {
                    lineBuffer.push(lines[i]);
                    if (i === lines.length - 1) {
                        result += `+ ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                } else {
                    if (i > 0 && lineBuffer.length > 0) {
                        result += `+ ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                    if (i === lines.length - 1 && text.endsWith('\n')) {
                        result += `+ ${lines[i]}\n`;
                    } else if (i < lines.length - 1) {
                        result += `+ ${lines[i]}\n`;
                    } else if (i === lines.length - 1 && lines[i] !== '') {
                        lineBuffer.push(lines[i]);
                    }
                }
            }
        } else if (operation === 1) {
            // 删除的文本（旧内容）
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (i === lines.length - 1 && lines[i] === '') {
                    continue;
                }
                if (i === 0 && lineBuffer.length > 0) {
                    lineBuffer.push(lines[i]);
                    if (i === lines.length - 1) {
                        result += `- ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                } else {
                    if (i > 0 && lineBuffer.length > 0) {
                        result += `- ${lineBuffer.join('')}\n`;
                        lineBuffer = [];
                    }
                    if (i === lines.length - 1 && text.endsWith('\n')) {
                        result += `- ${lines[i]}\n`;
                    } else if (i < lines.length - 1) {
                        result += `- ${lines[i]}\n`;
                    } else if (i === lines.length - 1 && lines[i] !== '') {
                        lineBuffer.push(lines[i]);
                    }
                }
            }
        }
    }

    if (lineBuffer.length > 0) {
        result += `  ${lineBuffer.join('')}\n`;
    }

    return result;
}

/**
 * 生成行级 diff，返回数组格式便于渲染
 * 修复了行号计算问题，并添加了智能截断功能
 */
export function generateLineDiff(
    oldText: string,
    newText: string,
    options?: {
        maxLines?: number; // 最大显示行数
        contextLines?: number; // 上下文行数
    }
): Array<{
    type: 'unchanged' | 'removed' | 'added';
    content: string;
    lineNumbers?: {
        old?: number;
        new?: number;
    };
}> {
    if (oldText === newText) {
        return [{ type: 'unchanged', content: oldText, lineNumbers: { old: 1, new: 1 } }];
    }

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    const result: Array<{
        type: 'unchanged' | 'removed' | 'added';
        content: string;
        lineNumbers?: {
            old?: number;
            new?: number;
        };
    }> = [];

    let oldLineNum = 1;
    let newLineNum = 1;

    // 首先生成完整的 diff 结果
    const fullDiff: typeof result = [];

    for (const [operation, text] of diffs) {
        if (text === '') continue;

        const lines = text.split('\n');
        const hasTrailingNewline = text.endsWith('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过空行（除了最后一个空行，如果文本以换行结尾）
            if (line === '' && (i < lines.length - 1 || !hasTrailingNewline)) {
                continue;
            }

            const lineObj: (typeof result)[number] = {
                type: operation === 0 ? 'unchanged' : operation === -1 ? 'added' : 'removed',
                content: line,
            };

            if (operation === 0) {
                lineObj.lineNumbers = { old: oldLineNum, new: newLineNum };
                oldLineNum++;
                newLineNum++;
            } else if (operation === -1) {
                lineObj.lineNumbers = { new: newLineNum };
                newLineNum++;
            } else if (operation === 1) {
                lineObj.lineNumbers = { old: oldLineNum };
                oldLineNum++;
            }

            fullDiff.push(lineObj);
        }
    }

    // 如果没有限制，返回全部
    if (!options?.maxLines) {
        return fullDiff;
    }

    // 智能截断：找到变更区域，只显示变更及其上下文
    const maxLines = options.maxLines;
    const contextLines = options.contextLines || 3;

    // 找到所有变更行的索引
    const changeIndices = fullDiff
        .map((line, idx) => (line.type !== 'unchanged' ? idx : -1))
        .filter((idx) => idx !== -1);

    if (changeIndices.length === 0 || fullDiff.length <= maxLines) {
        return fullDiff;
    }

    // 如果变更太多，按顺序显示前几个变更区域
    const resultLines: typeof result = [];
    let linesAdded = 0;

    // 分组变更区域
    const changeGroups: number[][] = [];
    let currentGroup: number[] = [];

    for (let i = 0; i < changeIndices.length; i++) {
        if (currentGroup.length === 0) {
            currentGroup.push(changeIndices[i]);
        } else {
            const lastIdx = currentGroup[currentGroup.length - 1];
            if (changeIndices[i] - lastIdx <= 1) {
                currentGroup.push(changeIndices[i]);
            } else {
                changeGroups.push([...currentGroup]);
                currentGroup = [changeIndices[i]];
            }
        }
    }
    if (currentGroup.length > 0) {
        changeGroups.push(currentGroup);
    }

    // 为每个变更组添加上下文并截断
    for (const group of changeGroups) {
        if (linesAdded >= maxLines) break;

        const groupStart = group[0];
        const groupEnd = group[group.length - 1];

        // 计算包含上下文的范围
        const contextStart = Math.max(0, groupStart - contextLines);
        const contextEnd = Math.min(fullDiff.length - 1, groupEnd + contextLines);

        // 检查是否会超出限制
        const groupLength = contextEnd - contextStart + 1;
        if (linesAdded + groupLength > maxLines && linesAdded > 0) {
            // 如果添加这个组会超出限制，添加省略号并停止
            resultLines.push({ type: 'unchanged', content: '...' });
            break;
        }

        // 添加这个组的所有行
        for (let i = contextStart; i <= contextEnd; i++) {
            if (linesAdded >= maxLines) {
                if (i < contextEnd) {
                    resultLines.push({ type: 'unchanged', content: '...' });
                }
                break;
            }
            resultLines.push(fullDiff[i]);
            linesAdded++;
        }

        // 如果是最后一个组，检查是否需要添加省略号
        if (group === changeGroups[changeGroups.length - 1] && linesAdded < fullDiff.length) {
            const remaining = fullDiff.length - contextEnd - 1;
            if (remaining > 0) {
                resultLines.push({ type: 'unchanged', content: `... (${remaining} more lines)` });
            }
        }
    }

    return resultLines;
}

/**
 * 简化的 diff 生成，用于工具输入展示
 */
export function generateSimpleDiff(oldText: string, newText: string): {
    oldText: string;
    newText: string;
    hasChanges: boolean;
} {
    return {
        oldText,
        newText,
        hasChanges: oldText !== newText,
    };
}

/**
 * 检查文本是否过大，需要特殊处理
 */
export function isLargeText(text: string, threshold: number = 1000): boolean {
    // 修复莫名奇妙的 null 输入问题
    text = text || ""
    return text.length > threshold || text.split('\n').length > 50;
}

/**
 * 生成优化的 diff，自动处理大文本
 */
export function generateOptimizedDiff(
    oldText: string,
    newText: string,
    options?: {
        maxLines?: number;
        contextLines?: number;
    }
) {
    // 如果文本很大，使用更激进的截断策略
    const isLarge = isLargeText(oldText) || isLargeText(newText);

    // 区分"显式传入 undefined"和"没传参数"
    const hasMaxLines = options !== undefined && 'maxLines' in options;
    const maxLines = hasMaxLines ? options.maxLines : (isLarge ? 10 : 20);
    const contextLines = options?.contextLines ?? (isLarge ? 1 : 3);

    return generateLineDiff(oldText, newText, { maxLines, contextLines });
}
