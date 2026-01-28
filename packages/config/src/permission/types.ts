import { z } from 'zod';
import type { ToolArgs } from '../types/index.js';

/**
 * Permission action types
 */
export enum PermissionAction {
  ALLOW = 'allow',
  ASK = 'ask',
  DENY = 'deny',
}

/**
 * Permission rule format: "ToolName" or "ToolName(specifier)"
 * Examples:
 * - "Bash" - matches all Bash tool calls
 * - "Bash(git commit )" - matches git commit with any args
 * - "Read(.env)" - matches exact .env file read
 * - "Read(./src/*.ts)" - matches any .ts file in src/
 */
export interface PermissionRule {
  /** Tool name (e.g., "Bash", "Read", "Write") */
  tool: string;
  /** Glob pattern for matching tool arguments (optional) */
  specifier?: string;
  /** Action to take when rule matches */
  action: PermissionAction;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  /** Rules that allow tool use */
  allow?: string[];
  /** Rules that require confirmation */
  ask?: string[];
  /** Rules that deny tool use */
  deny?: string[];
  /** Default permission mode */
  defaultMode?: PermissionAction;
}


/**
 * Permission check result
 */
export interface PermissionResult {
  /** Whether permission is granted */
  allowed: boolean;
  /** Whether user confirmation is required */
  requiresApproval: boolean;
  /** Matched rule (if any) */
  matchedRule?: PermissionRule;
  /** Reason for denial (useful for UI feedback) */
  reason?: string;
}

// Zod schemas for validation
export const PermissionRuleSchema = z.object({
  tool: z.string(),
  specifier: z.string().optional(),
  action: z.nativeEnum(PermissionAction),
});

export const PermissionConfigSchema = z.object({
  allow: z.array(z.string()).optional(),
  ask: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
  defaultMode: z.nativeEnum(PermissionAction).optional(),
});

/**
 * 工具调用接口
 */
export type PermissionCall = {
  name: 'Bash',
  args: { command: string, cwd?: string },
} | {
  name: 'Read' | "Write",
  args: { file_path: string },
}

export const ToolCallSchema = z.object({
  name: z.string(),
  args: z.record(z.string(), z.any()),
});
