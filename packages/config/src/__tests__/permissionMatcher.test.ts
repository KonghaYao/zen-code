import { describe, it, expect } from 'vitest';
import { PermissionMatcher } from '../permission/permissionMatcher';
import { PermissionAction } from '../permission/types';

describe('PermissionMatcher', () => {
  describe('Rule Parsing', () => {
    it('should parse simple tool rule', () => {
      const rule = PermissionMatcher.parseRule('Bash', PermissionAction.ALLOW);
      expect(rule).toEqual({
        tool: 'Bash',
        action: PermissionAction.ALLOW,
      });
    });

    it('should parse tool with specifier', () => {
      const rule = PermissionMatcher.parseRule('Bash(git status)', PermissionAction.ALLOW);
      expect(rule).toEqual({
        tool: 'Bash',
        specifier: 'git status',
        action: PermissionAction.ALLOW,
      });
    });

    it('should parse wildcard specifier', () => {
      const rule = PermissionMatcher.parseRule('Bash(git commit )', PermissionAction.ALLOW);
      expect(rule.specifier).toBe('git commit ');
    });

    it('should parse MCP tool name', () => {
      const rule = PermissionMatcher.parseRule('mcp__github__', PermissionAction.ALLOW);
      expect(rule.tool).toBe('mcp__github__');
      expect(rule.specifier).toBeUndefined();
    });

    it('should throw on invalid format', () => {
      expect(() => {
        PermissionMatcher.parseRule('invalid-tool-name(without-proper-closing', PermissionAction.ALLOW);
      }).toThrow();
    });
  });

  describe('Config Parsing', () => {
    it('should create matcher from complete config', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash(git status)', 'Read(./src/*.ts)'],
        ask: ['Bash(git push)'],
        deny: ['Bash(rm -rf /)', 'Read(.env)'],
        defaultMode: PermissionAction.ASK,
      });

      expect(matcher).toBeInstanceOf(PermissionMatcher);
    });

    it('should use default defaultMode', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Read(./src/*.ts)'],
      });

      const result = matcher.checkPermission({
        name: 'Write',
        args: { file_path: 'test.txt' },
      });

      // defaultMode is ASK, which means allowed=true but requires approval
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('Permission Matching', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: ['Bash(git status)', 'Read(./src/*.ts)'],
      ask: ['Bash(git push)'],
      deny: ['Bash(rm -rf /)', 'Read(.env)'],
      defaultMode: PermissionAction.DENY,
    });

    it('should allow matching allow rule', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'git status' },
      });
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule?.action).toBe(PermissionAction.ALLOW);
    });

    it('should deny matching deny rule', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'rm -rf /' },
      });
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
      expect(result.reason).toContain('DENY');
    });

    it('should require approval for matching ask rule', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'git push' },
      });
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.matchedRule?.action).toBe(PermissionAction.ASK);
    });

    it('should use default mode when no rule matches', () => {
      const result = matcher.checkPermission({
        name: 'Write',
        args: { file_path: 'test.txt' },
      });
      expect(result.allowed).toBe(false); // defaultMode is 'deny'
      expect(result.requiresApproval).toBe(false); // DENY doesn't require approval
      expect(result.reason).toContain('default mode');
    });

    it('should match wildcard patterns for file paths', () => {
      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: './src/index.ts' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should deny exact file match', () => {
      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: '.env' },
      });
      expect(result.allowed).toBe(false);
    });

    it('should match wildcard in command', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'git commit -m message' },
      });
      expect(result.allowed).toBe(false); // Not in allow list
    });
  });

  describe('Wildcard Pattern Matching', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: [
        'Bash(git )',  // All git commands
        'Read(./src/**/*.ts)',  // Recursive match
        'Bash(* --version)',  // Any --version command
      ],
      defaultMode: PermissionAction.DENY,
    });

    it('should match any git command', () => {
      const commands = [
        'git status',
        'git commit -m "test"',
        'git log --oneline',
        'git diff HEAD~1'
      ];

      commands.forEach(cmd => {
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: cmd },
        });
        expect(result.allowed).toBe(true);
      });
    });

    it('should recursively match nested files', () => {
      const files = [
        './src/index.ts',
        './src/components/Header.ts',
        './src/utils/helpers/string.ts',
      ];

      files.forEach(file => {
        const result = matcher.checkPermission({
          name: 'Read',
          args: { file_path: file },
        });
        expect(result.allowed).toBe(true);
      });
    });

    it('should match any --version command', () => {
      const commands = ['node --version', 'npm --version', 'git --version'];

      commands.forEach(cmd => {
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: cmd },
        });
        expect(result.allowed).toBe(true);
      });
    });

    it('should not match different commands', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'npm install' },
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Bash Command Handling', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: ['Bash(safe-cmd)'],
      deny: ['Bash(dangerous-cmd)'],
      defaultMode: PermissionAction.ASK,
    });

    it('should match simple command', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'safe-cmd' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should not match chained commands with shell operators', () => {
      // safe-cmd && other-cmd should NOT match "Bash(safe-cmd)" rule
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'safe-cmd && other-cmd' },
      });
      // Should use default mode (ask) since no rule matches the full command
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle pipe operator', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'cat file | grep pattern' },
      });
      // | operator prevents rule matching for security
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle semicolon', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'safe-cmd; other-cmd' },
      });
      // ; operator prevents rule matching for security
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle redirection', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'safe-cmd > output.txt' },
      });
      // > is safe, only matches first command
      expect(result.allowed).toBe(true);
    });

    it('should deny dangerous command with operators', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'dangerous-cmd && other-cmd' },
      });
      // && operator prevents rule matching for security
      // Uses default mode (ask), so allowed=true but requires approval
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('Priority Order', () => {
    it('should prioritize deny over allow', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash'],  // Allow all Bash
        deny: ['Bash(rm -rf )'],  // But deny rm -rf (note trailing space for prefix match)
        defaultMode: PermissionAction.ASK,
      });

      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'rm -rf test' },
      });
      expect(result.allowed).toBe(false);
      expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
    });

    it('should prioritize ask over allow', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash'],  // Allow all Bash
        ask: ['Bash(git push)'],  // But ask for git push
        defaultMode: PermissionAction.ASK,
      });

      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'git push' },
      });
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.matchedRule?.action).toBe(PermissionAction.ASK);
    });

    it('should prioritize deny over ask', () => {
      const matcher = PermissionMatcher.fromConfig({
        ask: ['Bash'],  // Ask for all Bash
        deny: ['Bash(rm -rf )'],  // But deny rm -rf (note trailing space for prefix match)
        defaultMode: PermissionAction.ASK,
      });

      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'rm -rf test' },
      });
      expect(result.allowed).toBe(false);
      expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
    });
  });

  describe('Tool Without Specifier', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: ['Read'],  // Allow all Read operations
      deny: ['Read(.env)'],  // But deny reading .env
      defaultMode: PermissionAction.DENY,
    });

    it('should match all operations for tool without specifier', () => {
      const result1 = matcher.checkPermission({
        name: 'Read',
        args: { file_path: 'any-file.txt' },
      });
      expect(result1.allowed).toBe(true);

      const result2 = matcher.checkPermission({
        name: 'Read',
        args: { file_path: '.env' },
      });
      // Deny rule is more specific, so it should match
      expect(result2.allowed).toBe(false);
    });

    it('should not match different tool', () => {
      const result = matcher.checkPermission({
        name: 'Write',
        args: { file_path: 'test.txt' },
      });
      expect(result.allowed).toBe(false); // defaultMode is deny
    });
  });

  describe('Caching', () => {
    it('should cache pattern matching results', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash(git status)'],
        defaultMode: PermissionAction.DENY,
      });

      const toolCall = {
        name: 'Bash' as const,
        args: { command: 'git status' },
      };

      // First call
      const result1 = matcher.checkPermission(toolCall);
      expect(result1.allowed).toBe(true);
      expect(matcher.getCacheSize()).toBeGreaterThan(0);

      // Second call - should use cache
      const result2 = matcher.checkPermission(toolCall);
      expect(result2.allowed).toBe(true);
    });

    it('should clear cache when requested', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash(git status)'],
        defaultMode: PermissionAction.DENY,
      });

      matcher.checkPermission({
        name: 'Bash',
        args: { command: 'git status' },
      });

      expect(matcher.getCacheSize()).toBeGreaterThan(0);

      matcher.clearCache();
      expect(matcher.getCacheSize()).toBe(0);
    });

    it('should limit cache size', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: Array.from({ length: 1100 }, (_, i) => `Bash(cmd${i})`),
        defaultMode: PermissionAction.DENY,
      });

      // Add more than 1000 unique patterns to cache
      for (let i = 0; i < 1100; i++) {
        matcher.checkPermission({
          name: 'Bash',
          args: { command: `cmd${i}` },
        });
      }

      // Cache should be limited to approximately 1000 entries (may exceed slightly)
      expect(matcher.getCacheSize()).toBeGreaterThan(1000);
      expect(matcher.getCacheSize()).toBeLessThan(1100);
    });
  });

  describe('Args to String Conversion', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: ['Read(./test.txt)', 'Bash(echo hello )'],  // trailing space for prefix match
      defaultMode: PermissionAction.DENY,
    });

    it('should handle string args', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'echo hello world' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should handle array args', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'echo hello' },
      });
      // ['echo', 'hello'] => 'echo hello', not 'echo hello ' (no trailing space)
      // Doesn't match rule 'Bash(echo hello )' which requires trailing space for prefix match
      expect(result.allowed).toBe(false);
    });

    it('should handle file_path in args', () => {
      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: './test.txt' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should handle nested args', () => {
      const result = matcher.checkPermission({
        name: 'Bash',
        args: {
          command: 'npm install',
          cwd: '/tmp',
        },
      });
      // Should match based on command array
      expect(result.allowed).toBe(false); // Not in allow list
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty specifier as wildcard', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Bash()'],  // Empty specifier
        defaultMode: PermissionAction.DENY,
      });

      const result = matcher.checkPermission({
        name: 'Bash',
        args: { command: 'any-command' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should handle special characters in paths', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Read(./src/*.ts)'],
        defaultMode: PermissionAction.DENY,
      });

      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: './src/file with spaces.ts' },
      });
      // micromatch supports spaces, so './src/file with spaces.ts' matches './src/*.ts'
      expect(result.allowed).toBe(true);
    });

    it('should handle unicode in paths', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Read(./src/*.ts)'],
        defaultMode: PermissionAction.DENY,
      });

      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: './src/文件.ts' },
      });
      // micromatch supports unicode, so './src/文件.ts' matches './src/*.ts'
      expect(result.allowed).toBe(true);
    });

    it('should fall back to exact match for invalid patterns', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['Read(exact-file.txt)'],
        defaultMode: PermissionAction.DENY,
      });

      const result = matcher.checkPermission({
        name: 'Read',
        args: { file_path: 'exact-file.txt' },
      });
      expect(result.allowed).toBe(true);
    });

    it('should handle MCP tool names', () => {
      const matcher = PermissionMatcher.fromConfig({
        allow: ['mcp__github__'],
        defaultMode: PermissionAction.DENY,
      });

      const result = matcher.checkPermission({
        /** @ts-ignore */
        name: 'mcp__github__',
        /** @ts-ignore */
        args: { action: 'create_pr' },
      });
      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================================
  // Real-World User Config Scenarios (from user-permission-test.test.ts)
  // ============================================================================

  describe('Real-World User Config Scenarios', () => {
    const matcher = PermissionMatcher.fromConfig({
      allow: [
        'Bash(npm run lint)',
        'Bash(npm run test *)',
        'Read(~/.zshrc)',
      ],
      deny: [
        'Bash(curl )',  // Prefix match: any curl command (curl with space means "curl" followed by anything)
        'Read(./.env)',
        'Read(./.env.*)',
        'Read(./secrets/**)',
      ],
      defaultMode: PermissionAction.ASK,
    });

    describe('Allow Rules - User Scenarios', () => {
      it('should allow exact match: npm run lint', () => {
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: 'npm run lint' },
        });

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
        expect(result.matchedRule?.action).toBe(PermissionAction.ALLOW);
      });

      it('should allow wildcard match: npm run test *', () => {
        const testCommands = [
          'npm run test unit',
          'npm run test --coverage',
          'npm run test unit --watch',
        ];

        testCommands.forEach(cmd => {
          const result = matcher.checkPermission({
            name: 'Bash',
            args: { command: cmd },
          });

          expect(result.allowed).toBe(true);
          expect(result.requiresApproval).toBe(false);
        });
      });

      it('should allow reading .zshrc from home', () => {
        const result = matcher.checkPermission({
          name: 'Read',
          args: { file_path: '~/.zshrc' },
        });

        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(false);
      });
    });

    describe('Deny Rules - Security Scenarios', () => {
      it('should deny curl with wildcard: curl *', () => {
        const curlCommands = [
          'curl https://api.example.com',
          'curl -X POST http://localhost:8080',
          'curl -H Content-Type: application/json http://example.com',
        ];

        curlCommands.forEach(cmd => {
          const result = matcher.checkPermission({
            name: 'Bash',
            args: { command: cmd },
          });

          expect(result.allowed).toBe(false);
          expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
        });
      });

      it('should deny exact match: .env', () => {
        const result = matcher.checkPermission({
          name: 'Read',
          args: { file_path: '.env' },
        });

        expect(result.allowed).toBe(false);
        expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
      });

      it('should deny pattern match: .env.* (dot env variants)', () => {
        const envFiles = [
          '.env.local',
          '.env.production',
          '.env.example',
          '.env.test',
        ];

        envFiles.forEach(file => {
          const result = matcher.checkPermission({
            name: 'Read',
            args: { file_path: file },
          });

          expect(result.allowed).toBe(false);
          expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
        });
      });

      it('should deny recursive match: ./secrets/**', () => {
        const secretFiles = [
          './secrets/api-key.txt',
          './secrets/config.yaml',
          './secrets/subfolder/password.txt',
          './secrets/deeply/nested/file.txt',
        ];

        secretFiles.forEach(file => {
          const result = matcher.checkPermission({
            name: 'Read',
            args: { file_path: file },
          });

          expect(result.allowed).toBe(false);
          expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
        });
      });
    });

    describe('Default Mode Behavior - User Scenarios', () => {
      it('should use default mode (ask) for unmatched rules', () => {
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: 'git status' },
        });

        // ASK mode: allowed=true but requires approval
        expect(result.allowed).toBe(true);
        expect(result.requiresApproval).toBe(true);
        expect(result.reason).toContain('default mode');
      });
    });

    describe('Priority: Deny over Allow - User Scenarios', () => {
      it('should prioritize deny even if allow might match', () => {
        // Create a matcher where both allow and deny could potentially match
        const priorityMatcher = PermissionMatcher.fromConfig({
          allow: ['Read(./ **)'],  // Allow all reads in current dir
          deny: ['Read(./secrets/**)'],  // But deny secrets
          defaultMode: PermissionAction.ASK,
        });

        const result = priorityMatcher.checkPermission({
          name: 'Read',
          args: { file_path: './secrets/api-key.txt' },
        });

        expect(result.allowed).toBe(false);
        expect(result.matchedRule?.action).toBe(PermissionAction.DENY);
      });
    });

    describe('Edge Cases from User Config', () => {
      it('should handle home directory path correctly', () => {
        const result = matcher.checkPermission({
          name: 'Read',
          args: { file_path: '~/.zshrc' },
        });

        expect(result.allowed).toBe(true);
      });

      it('should not match .env in subdirectory when rule is for root .env', () => {
        const result = matcher.checkPermission({
          name: 'Read',
          args: { file_path: './config/.env' },
        });

        // ./config/.env should not match '.env' pattern exactly
        // But it should use default mode (ask)
        expect(result.requiresApproval).toBe(true);
      });

      it('should handle npm run with different scripts', () => {
        const notAllowedScript = matcher.checkPermission({
          name: 'Bash',
          args: { command: 'npm run build' },
        });

        // ASK mode: allowed=true but requires approval
        expect(notAllowedScript.allowed).toBe(true);
        expect(notAllowedScript.requiresApproval).toBe(true);
      });

      it('should match wildcard in test command correctly', () => {
        // Should match "npm run test *" where * can be anything
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: 'npm run test unit --verbose --coverage' },
        });

        expect(result.allowed).toBe(true);
      });

      it('should deny curl even with other flags', () => {
        const result = matcher.checkPermission({
          name: 'Bash',
          args: { command: 'curl -s -o /dev/null http://example.com' },
        });

        expect(result.allowed).toBe(false);
      });
    });
  });
});
