/**
 * Text Input Utility Functions for MultiLineTextInput
 * 
 * Provides utilities for:
 * - Converting between text string and lines array
 * - Converting between character offset and (line, column) coordinates
 * - Virtual scrolling calculations
 * - Character width calculation for proper rendering
 */

/**
 * Get display width of a character (East Asian Width)
 * CJK characters and full-width symbols count as 2, others as 1
 */
export function getCharWidth(char: string): number {
  const code = char.codePointAt(0) || 0;
  
  // CJK Unified Ideographs
  if ((code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x20000 && code <= 0x2A6DF) ||
      (code >= 0x2A700 && code <= 0x2B73F) ||
      (code >= 0x2B740 && code <= 0x2B81F) ||
      (code >= 0x2B820 && code <= 0x2CEAF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0x2F800 && code <= 0x2FA1F)) {
    return 2;
  }
  
  // Fullwidth punctuation and symbols
  if ((code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6)) {
    return 2;
  }
  
  // Hangul syllables
  if (code >= 0xAC00 && code <= 0xD7AF) {
    return 2;
  }
  
  return 1;
}

/**
 * Get display width of a string
 */
export function getStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += getCharWidth(char);
  }
  return width;
}

/**
 * Get substring by display width (not character count)
 * @param str - Input string
 * @param maxWidth - Maximum display width
 * @returns String with display width <= maxWidth
 */
export function substringByWidth(str: string, maxWidth: number): string {
  let currentWidth = 0;
  let result = '';
  
  for (const char of str) {
    const charWidth = getCharWidth(char);
    if (currentWidth + charWidth > maxWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }
  
  return result;
}

/**
 * Split text into lines, handling various newline formats (\n, \r, \r\n)
 * @param text - Input text
 * @returns Array of lines (without newline characters)
 */
export function splitTextIntoLines(text: string): string[] {
  if (text.length === 0) {
    return [''];
  }

  // Normalize all line endings to \n first
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by \n and handle trailing newline
  const lines = normalized.split('\n');
  
  // If text ends with \n, add an empty line at the end
  if (normalized.endsWith('\n')) {
    lines.push('');
  }
  
  return lines;
}

/**
 * Join lines array into text with \n line endings
 * @param lines - Array of lines
 * @returns Joined text string
 */
export function joinLinesIntoText(lines: string[]): string {
  return lines.join('\n');
}

/**
 * Convert character offset to (line, column) coordinates
 * @param text - Input text
 * @param offset - Character offset (0-based)
 * @returns Object with line and column (both 0-based)
 */
export function offsetToLineColumn(
  text: string,
  offset: number
): { line: number; column: number } {
  const lines = splitTextIntoLines(text);
  
  let currentOffset = 0;
  for (let line = 0; line < lines.length; line++) {
    const lineLength = lines[line].length;
    
    // Check if offset is within this line
    if (offset <= currentOffset + lineLength) {
      return {
        line,
        column: offset - currentOffset,
      };
    }
    
    // Move to next line (account for \n)
    currentOffset += lineLength + 1;
  }
  
  // Offset is at the end of text
  return {
    line: lines.length - 1,
    column: lines[lines.length - 1].length,
  };
}

/**
 * Convert (line, column) coordinates to character offset
 * @param lines - Array of lines
 * @param line - Line number (0-based)
 * @param column - Column number (0-based)
 * @returns Character offset (0-based)
 */
export function lineColumnToOffset(
  lines: string[],
  line: number,
  column: number
): number {
  if (lines.length === 0) {
    return 0;
  }
  
  // Clamp line to valid range
  const clampedLine = Math.max(0, Math.min(line, lines.length - 1));
  
  let offset = 0;
  for (let i = 0; i < clampedLine; i++) {
    offset += lines[i].length + 1; // +1 for \n
  }
  
  // Clamp column to valid range for this line
  const clampedColumn = Math.max(0, Math.min(column, lines[clampedLine].length));
  
  return offset + clampedColumn;
}

/**
 * Calculate visible range for virtual scrolling
 * @param totalLines - Total number of lines
 * @param firstVisibleLine - Index of first visible line
 * @param maxVisibleLines - Maximum number of visible lines
 * @returns Object with start and end indices (inclusive-exclusive)
 */
export function calculateVisibleRange(
  totalLines: number,
  firstVisibleLine: number,
  maxVisibleLines: number
): { start: number; end: number } {
  const start = Math.max(0, firstVisibleLine);
  const end = Math.min(totalLines, start + maxVisibleLines);
  
  return { start, end };
}

/**
 * Ensure cursor is visible by adjusting firstVisibleLine if needed
 * @param cursorLine - Current cursor line
 * @param firstVisibleLine - Current first visible line
 * @param maxVisibleLines - Maximum number of visible lines
 * @param totalLines - Total number of lines
 * @returns New firstVisibleLine
 */
export function ensureCursorVisible(
  cursorLine: number,
  firstVisibleLine: number,
  maxVisibleLines: number,
  totalLines: number
): number {
  // If cursor is above viewport, scroll up
  if (cursorLine < firstVisibleLine) {
    return cursorLine;
  }
  
  // If cursor is below viewport, scroll down
  const lastVisibleLine = firstVisibleLine + maxVisibleLines - 1;
  if (cursorLine > lastVisibleLine) {
    return Math.max(0, cursorLine - maxVisibleLines + 1);
  }
  
  // Cursor is already visible
  return firstVisibleLine;
}

/**
 * Clamp cursor position to valid range
 * @param lines - Array of lines
 * @param cursorLine - Cursor line
 * @param cursorColumn - Cursor column
 * @returns Clamped cursor position
 */
export function clampCursor(
  lines: string[],
  cursorLine: number,
  cursorColumn: number
): { line: number; column: number } {
  // Clamp line to valid range
  const clampedLine = Math.max(0, Math.min(cursorLine, lines.length - 1));
  
  // Clamp column to valid range for this line
  const clampedColumn = Math.max(
    0,
    Math.min(cursorColumn, lines[clampedLine].length)
  );
  
  return {
    line: clampedLine,
    column: clampedColumn,
  };
}
