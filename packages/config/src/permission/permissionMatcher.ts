import mm from 'micromatch';
import type { ToolArgs } from '../types/index.js';
import { PermissionRule, PermissionResult, PermissionAction, PermissionCall } from './types';
import { PermissionConfig } from '../types/index.js';

/**
 * Permission Matcher Engine
 *
 * Uses micromatch for glob-based pattern matching of tool calls
 * against permission rules.
 */
export class PermissionMatcher {
  private rules: PermissionRule[];
  private defaultMode: PermissionAction;
  private patternCache = new Map<string, boolean>();

  constructor(config: { rules: PermissionRule[]; defaultMode?: PermissionAction }) {
    this.rules = config.rules;
    this.defaultMode = config.defaultMode || PermissionAction.ASK;

    // Sort rules by priority:
    // 1. Action priority: deny > ask > allow
    // 2. Specificity: rules with specifier > rules without specifier (wildcard)
    this.rules.sort((a, b) => {
      const priority = { deny: 0, ask: 1, allow: 2 };
      const actionPriority = priority[a.action] - priority[b.action];

      // If actions have different priority, sort by action
      if (actionPriority !== 0) {
        return actionPriority;
      }

      // If actions are the same, prefer more specific rules (with specifier)
      const aSpecificity = a.specifier == null ? 1 : 0;
      const bSpecificity = b.specifier == null ? 1 : 0;
      return aSpecificity - bSpecificity;
    });
  }

  /**
   * Check if a tool call is permitted
   */
  checkPermission(toolCall: PermissionCall): PermissionResult {
    // Check rules in priority order (deny first)
    for (const rule of this.rules) {
      if (this.matchRule(rule, toolCall)) {
        return {
          allowed: rule.action === 'allow' || rule.action === 'ask',
          requiresApproval: rule.action === 'ask',
          matchedRule: rule,
          reason: this.getReason(rule),
        };
      }
    }

    // No rule matched - use default mode
    return {
      allowed: this.defaultMode === 'allow' || this.defaultMode === 'ask',
      requiresApproval: this.defaultMode === 'ask',
      reason: `No matching rule, using default mode: ${this.defaultMode}`,
    };
  }

  /**
   * Check if a rule matches a tool call
   */
  private matchRule(rule: PermissionRule, toolCall: PermissionCall): boolean {
    // Tool name must match
    if (rule.tool !== toolCall.name) {
      return false;
    }

    // If no specifier (null, undefined, or empty string), rule matches all calls to this tool
    if (!rule.specifier) {
      return true;
    }

    // Convert tool arguments to string for matching
    const argsString = this.argsToString(toolCall.args);

    // Special handling for Bash tool
    if (toolCall.name === 'Bash') {
      return this.matchBashCommand(rule.specifier, argsString);
    }

    // Check if specifier ends with space - if so, treat as prefix match
    // This follows Claude Code's pattern: "Bash(git commit )" matches "git commit -m message"
    // But only if there are no glob characters (*, ?, []) in the specifier
    if (rule.specifier.endsWith(' ') && !/[*?[\\]/.test(rule.specifier)) {
      return argsString.startsWith(rule.specifier);
    }

    // Standard glob matching
    return this.matchGlob(rule.specifier, argsString);
  }

  /**
   * Match Bash commands with shell operator awareness
   */
  private matchBashCommand(pattern: string, command: string): boolean {
    // Dangerous operators that should NEVER match (security risk)
    // These allow command chaining that could bypass security
    const dangerousOperators = /[;&|]/;

    if (dangerousOperators.test(command)) {
      // For security, DO NOT match rules when &&, ;, or | are present
      // This prevents "safe-cmd && malicious-cmd" or "safe-cmd; malicious-cmd" from matching "safe-cmd" rule
      return false;
    }

    // Safe operators that only redirect or group
    // <, >, () are okay - just check the first command
    const safeOperators = /[<>()]/;

    if (safeOperators.test(command)) {
      // Only match the first command before the operator
      const firstCommand = command.split(safeOperators)[0].trim();
      return this.matchBashPattern(pattern, firstCommand);
    }

    return this.matchBashPattern(pattern, command);
  }

  /**
   * Match Bash command patterns with support for prefix and glob matching
   */
  private matchBashPattern(pattern: string, command: string): boolean {
    // If pattern ends with space, use prefix match (even if pattern contains glob chars)
    // This allows "Bash(curl *)" to match "curl https://api.example.com"
    if (pattern.endsWith(' ')) {
      return command.startsWith(pattern);
    }

    // Otherwise, use standard glob matching
    return this.matchGlob(pattern, command);
  }

  /**
   * Glob pattern matching using micromatch with caching
   */
  private matchGlob(pattern: string, str: string): boolean {
    try {
      // Normalize paths by removing leading ./ for consistent matching
      // micromatch automatically normalizes patterns, so we need to normalize input too
      const normalizedPattern = pattern.replace(/^\.\//, '');
      const normalizedStr = str.replace(/^\.\//, '');

      // Check cache first
      const cacheKey = `${pattern}::${str}`;
      const cached = this.patternCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const result = mm.isMatch(normalizedStr, normalizedPattern, {
        nocase: false,
        dot: true,
      });

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      // If pattern is invalid, fall back to exact match
      return str === pattern;
    }
  }

  /**
   * Cache matching result with LRU-style size limit
   */
  private cacheResult(key: string, result: boolean): void {
    // Limit cache size to prevent memory issues
    if (this.patternCache.size > 1000) {
      const firstKey = this.patternCache.keys().next().value;
      if (firstKey) {
        this.patternCache.delete(firstKey);
      }
    }
    this.patternCache.set(key, result);
  }

  /**
   * Convert tool arguments to string representation
   */
  private argsToString(args: ToolArgs): string {
    if (typeof args === 'object' && args !== null) {
      // Special handling for Bash tool
      if ('command' in args && args.command) {
        return String(args.command);
      }

      // Special handling for file operations
      if ('file_path' in args && args.file_path) {
        return String(args.file_path);
      }

      // Generic: join all values
      return Object.values(args).flat().join(' ');
    }

    return String(args);
  }

  /**
   * Get human-readable reason for permission decision
   */
  private getReason(rule: PermissionRule): string {
    const action = rule.action.toUpperCase();
    const tool = rule.tool;
    const specifier = rule.specifier ? `(${rule.specifier})` : '';
    return `${action} rule matched: ${tool}${specifier}`;
  }

  /**
   * Parse permission rule from string format
   * Examples:
   * - "Bash" -> { tool: "Bash", action: "allow" }
   * - "Bash(git commit )" -> { tool: "Bash", specifier: "git commit ", action: "allow" }
   */
  static parseRule(ruleString: string, action: PermissionAction): PermissionRule {
    const match = ruleString.match(/^(\w+)(?:\((.*)\))?$/);

    if (!match) {
      throw new Error(`Invalid permission rule format: ${ruleString}`);
    }

    const [, tool, specifier] = match;

    return {
      tool,
      specifier: specifier,  // MODIFIED: Don't trim - preserve trailing spaces which are significant for glob patterns
      action,
    };
  }

  /**
   * Create matcher from configuration object
   */
  static fromConfig(config: PermissionConfig): PermissionMatcher {
    const rules: PermissionRule[] = [];

    // Parse allow rules
    for (const rule of config.allow || []) {
      rules.push(PermissionMatcher.parseRule(rule, PermissionAction.ALLOW));
    }

    // Parse ask rules
    for (const rule of config.ask || []) {
      rules.push(PermissionMatcher.parseRule(rule, PermissionAction.ASK));
    }

    // Parse deny rules
    for (const rule of config.deny || []) {
      rules.push(PermissionMatcher.parseRule(rule, PermissionAction.DENY));
    }

    return new PermissionMatcher({
      rules,
      defaultMode: config.defaultMode || PermissionAction.ASK,
    });
  }

  /**
   * Clear cache (useful for testing or config reload)
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.patternCache.size;
  }
}
