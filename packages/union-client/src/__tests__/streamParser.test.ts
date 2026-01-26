import { describe, it, expect } from 'vitest';
import { parseStreamChunk, aggregateStreamChunks, type StreamChunk } from '../utils/streamParser.js';

describe('streamParser', () => {
  describe('parseStreamChunk', () => {
    it('should parse content chunk', () => {
      const chunk = { content: 'Hello, world!' };
      const result = parseStreamChunk(chunk);

      expect(result).toEqual({
        type: 'content',
        data: 'Hello, world!',
      });
    });

    it('should parse tool calls chunk', () => {
      const toolCalls = [
        { name: 'read_file', args: { path: '/test/file.txt' } },
        { name: 'write_file', args: { path: '/test/out.txt' } },
      ];
      const chunk = { tool_calls: toolCalls };
      const result = parseStreamChunk(chunk);

      expect(result).toEqual({
        type: 'tool',
        data: toolCalls,
      });
    });

    it('should parse thinking chunk', () => {
      const chunk = { thinking: 'Let me analyze this...' };
      const result = parseStreamChunk(chunk);

      expect(result).toEqual({
        type: 'thinking',
        data: 'Let me analyze this...',
      });
    });

    it('should parse metadata chunk', () => {
      const metadata = { model: 'gpt-4', tokens: 100 };
      const chunk = { metadata };
      const result = parseStreamChunk(chunk);

      expect(result).toEqual({
        type: 'metadata',
        data: metadata,
      });
    });

    it('should return null for null chunk', () => {
      const result = parseStreamChunk(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined chunk', () => {
      const result = parseStreamChunk(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty object', () => {
      const result = parseStreamChunk({});
      expect(result).toBeNull();
    });

    it('should prioritize content over other fields', () => {
      const chunk = {
        content: 'Main content',
        tool_calls: [{ name: 'tool' }],
        thinking: 'Some thought',
      };
      const result = parseStreamChunk(chunk);

      expect(result?.type).toBe('content');
      expect(result?.data).toBe('Main content');
    });
  });

  describe('aggregateStreamChunks', () => {
    it('should aggregate content chunks', () => {
      const chunks: StreamChunk[] = [
        { type: 'content', data: 'Hello, ' },
        { type: 'content', data: 'world!' },
      ];

      const result = aggregateStreamChunks(chunks);

      expect(result.content).toBe('Hello, world!');
      expect(result.tools).toEqual([]);
      expect(result.thinking).toBe('');
      expect(result.metadata).toEqual({});
    });

    it('should aggregate tool chunks', () => {
      const tool1 = { name: 'read_file', args: { path: '/file1.txt' } };
      const tool2 = { name: 'write_file', args: { path: '/file2.txt' } };
      const chunks: StreamChunk[] = [
        { type: 'tool', data: [tool1] },
        { type: 'tool', data: [tool2] },
      ];

      const result = aggregateStreamChunks(chunks);

      expect(result.tools).toEqual([tool1, tool2]);
      expect(result.content).toBe('');
    });

    it('should aggregate thinking chunks', () => {
      const chunks: StreamChunk[] = [
        { type: 'thinking', data: 'Thinking step 1...' },
        { type: 'thinking', data: 'Thinking step 2...' },
      ];

      const result = aggregateStreamChunks(chunks);

      expect(result.thinking).toBe('Thinking step 1...Thinking step 2...');
      expect(result.content).toBe('');
    });

    it('should merge metadata chunks', () => {
      const chunks: StreamChunk[] = [
        { type: 'metadata', data: { model: 'gpt-4' } },
        { type: 'metadata', data: { tokens: 100 } },
        { type: 'metadata', data: { temperature: 0.7 } },
      ];

      const result = aggregateStreamChunks(chunks);

      expect(result.metadata).toEqual({
        model: 'gpt-4',
        tokens: 100,
        temperature: 0.7,
      });
    });

    it('should handle mixed chunks', () => {
      const chunks: StreamChunk[] = [
        { type: 'content', data: 'Response: ' },
        { type: 'thinking', data: 'Analyzing...' },
        { type: 'content', data: 'The answer' },
        { type: 'tool', data: [{ name: 'search', args: { query: 'test' } }] },
        { type: 'metadata', data: { model: 'gpt-4' } },
        { type: 'content', data: ' is 42.' },
      ];

      const result = aggregateStreamChunks(chunks);

      expect(result.content).toBe('Response: The answer is 42.');
      expect(result.thinking).toBe('Analyzing...');
      expect(result.tools).toEqual([{ name: 'search', args: { query: 'test' } }]);
      expect(result.metadata).toEqual({ model: 'gpt-4' });
    });

    it('should handle empty chunks array', () => {
      const result = aggregateStreamChunks([]);

      expect(result.content).toBe('');
      expect(result.tools).toEqual([]);
      expect(result.thinking).toBe('');
      expect(result.metadata).toEqual({});
    });

    it('should not mutate metadata when merging', () => {
      const metadata1 = { model: 'gpt-4' };
      const metadata2 = { temperature: 0.7 };

      const chunks: StreamChunk[] = [
        { type: 'metadata', data: metadata1 },
        { type: 'metadata', data: metadata2 },
      ];

      const result = aggregateStreamChunks(chunks);

      // Original objects should remain unchanged
      expect(metadata1).toEqual({ model: 'gpt-4' });
      expect(metadata2).toEqual({ temperature: 0.7 });

      // Result should have both
      expect(result.metadata).toEqual({
        model: 'gpt-4',
        temperature: 0.7,
      });
    });
  });
});
