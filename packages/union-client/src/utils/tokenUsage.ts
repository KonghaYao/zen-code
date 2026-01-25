/**
 * Token usage utilities
 * Calculate and format token usage for LLM applications
 */

export const MAX_TOKENS = 256 * 1024; // 256K
export const MAX_TOKENS_EXTENDED = 1024 * 1024; // 1M

export interface TokenUsage {
  current: number;
  max: number;
  percentage: number;
  isExtended: boolean;
}

/**
 * Calculate token usage with automatic max limit adjustment
 */
export const calculateTokenUsage = (currentTokens: number): TokenUsage => {
  let max = MAX_TOKENS;
  let isExtended = false;

  if (currentTokens > MAX_TOKENS) {
    max = MAX_TOKENS_EXTENDED;
    isExtended = true;
  }

  const percentage = Math.min(100, (currentTokens / max) * 100);

  return {
    current: currentTokens,
    max,
    percentage,
    isExtended,
  };
};

/**
 * Format token count for display (K/M suffixes)
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1024 * 1024) {
    return `${(tokens / (1024 * 1024)).toFixed(2)}M`;
  }
  if (tokens >= 1024) {
    return `${(tokens / 1024).toFixed(1)}K`;
  }
  return tokens.toString();
};
