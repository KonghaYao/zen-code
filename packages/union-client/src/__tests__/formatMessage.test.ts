import { describe, it, expect } from 'vitest';
import { formatMessage, formatTimestamp, parseMessage, extractThinking } from '../utils/formatMessage.js';
import type { ParsedMessage } from '../types/message.js';

describe('formatMessage', () => {
  describe('formatMessage', () => {
    it('should format plain text message', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'human',
        content: 'Hello, world!',
        metadata: {},
      };

      const result = formatMessage(message);
      expect(result).toBe('Hello, world!');
    });

    it('should format tool message', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'tool',
        content: 'executed: ls -la',
        metadata: {},
      };

      const result = formatMessage(message);
      expect(result).toBe('[Tool] executed: ls -la');
    });

    it('should format system message', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'system',
        content: 'System initialized',
        metadata: {},
      };

      const result = formatMessage(message);
      expect(result).toBe('[System] System initialized');
    });

    it('should include timestamp when requested', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'human',
        content: 'Hello',
        metadata: { timestamp: 1640995200000 }, // 2022-01-01 00:00:00
      };

      const result = formatMessage(message, { showTimestamp: true });
      expect(result).toMatch(/^\[\d{1,2}:\d{2}:\d{2} [AP]M\] Hello$/);
    });

    it('should include thinking when requested', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'ai',
        content: 'Here is the answer',
        metadata: {},
        thinking: 'Let me think about this...',
      };

      const result = formatMessage(message, { showThinking: true });
      expect(result).toContain('Here is the answer');
      expect(result).toContain('Thinking: Let me think about this...');
    });

    it('should not include thinking when showThinking is false', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'ai',
        content: 'Here is the answer',
        metadata: {},
        thinking: 'Let me think about this...',
      };

      const result = formatMessage(message, { showThinking: false });
      expect(result).toBe('Here is the answer');
      expect(result).not.toContain('Thinking');
    });

    it('should handle message with all options', () => {
      const message: ParsedMessage = {
        id: '1',
        type: 'ai',
        content: 'Response',
        metadata: { timestamp: 1640995200000 },
        thinking: 'Processing...',
      };

      const result = formatMessage(message, { showTimestamp: true, showThinking: true });
      expect(result).toMatch(/^\[\d{1,2}:\d{2}:\d{2} [AP]M\] Response/);
      expect(result).toContain('Thinking: Processing...');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp as locale time string', () => {
      const timestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
      const result = formatTimestamp(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('parseMessage', () => {
    it('should parse basic message', () => {
      const rawMessage = {
        id: 'msg-1',
        type: 'human',
        content: 'Hello',
        metadata: {},
      };

      const result = parseMessage(rawMessage);
      expect(result).toEqual({
        id: 'msg-1',
        type: 'human',
        content: 'Hello',
        metadata: {},
      });
    });

    it('should handle message without id', () => {
      const rawMessage = {
        type: 'ai',
        content: 'Response',
      };

      const result = parseMessage(rawMessage);
      expect(result.id).toBe('');
      expect(result.content).toBe('Response');
    });

    it('should handle message without type', () => {
      const rawMessage = {
        id: 'msg-1',
        content: 'Content',
      };

      const result = parseMessage(rawMessage);
      expect(result.type).toBe('human');
    });

    it('should handle message without content', () => {
      const rawMessage = {
        id: 'msg-1',
        type: 'system',
      };

      const result = parseMessage(rawMessage);
      expect(result.content).toBe('');
    });

    it('should handle message without metadata', () => {
      const rawMessage = {
        id: 'msg-1',
        type: 'ai',
        content: 'Response',
      };

      const result = parseMessage(rawMessage);
      expect(result.metadata).toEqual({});
    });
  });

  describe('extractThinking', () => {
    it('should extract thinking from message', () => {
      const message = {
        thinking: 'This is my thinking process',
      };

      const result = extractThinking(message);
      expect(result).toBe('This is my thinking process');
    });

    it('should return null when no thinking', () => {
      const message = {
        content: 'Just content',
      };

      const result = extractThinking(message);
      expect(result).toBeNull();
    });

    it('should return empty string for empty thinking', () => {
      const message = {
        thinking: '',
      };

      const result = extractThinking(message);
      expect(result).toBe('');
    });
  });
});
