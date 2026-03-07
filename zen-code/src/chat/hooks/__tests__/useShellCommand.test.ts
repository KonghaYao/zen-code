/**
 * useShellCommand Hook Tests
 *
 * Tests for shell command execution and state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShellCommand } from '../useShellCommand';

// Mock executeBashCommand
vi.mock('@codegraph/agent/src/server/bash_command', () => ({
    executeBashCommand: vi.fn(),
}));

// Import after mock
const { executeBashCommand } = await import('@codegraph/agent/src/server/bash_command');
const mockExecute = executeBashCommand as ReturnType<typeof vi.fn>;

describe('useShellCommand', () => {
    beforeEach(() => {
        mockExecute.mockClear();
    });

    it('should execute shell command successfully', async () => {
        mockExecute.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            output: 'Command output',
            status: 'completed',
            exitCode: 0,
        });

        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('echo test');
        });

        expect(result.current.activeCommand).toEqual({
            id: 'test-id',
            command: 'echo test',
            output: 'Command output',
            status: 'completed',
            exitCode: 0,
            pid: 12345,
        });

        expect(result.current.isExecuting).toBe(false);
    });

    it('should handle empty command', async () => {
        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('   ');
        });

        expect(result.current.activeCommand).toBeNull();
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should detect and reject interactive commands', async () => {
        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('vim file.txt');
        });

        expect(result.current.activeCommand).toEqual({
            id: '',
            command: 'vim file.txt',
            output: expect.stringContaining('交互式命令不支持'),
            status: 'failed',
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should detect git commit as interactive', async () => {
        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('git commit');
        });

        expect(result.current.activeCommand).toEqual({
            id: '',
            command: 'git commit',
            output: expect.stringContaining('交互式命令不支持'),
            status: 'failed',
        });

        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should allow non-interactive git commands', async () => {
        mockExecute.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            output: 'Commit created',
            status: 'completed',
            exitCode: 0,
        });

        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('git commit -m "test"');
        });

        expect(result.current.activeCommand).toEqual({
            id: 'test-id',
            command: 'git commit -m "test"',
            output: 'Commit created',
            status: 'completed',
            exitCode: 0,
            pid: 12345,
        });

        expect(mockExecute).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
        mockExecute.mockRejectedValueOnce(new Error('API request failed: Internal Server Error'));

        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('ls -la');
        });

        expect(result.current.activeCommand).toEqual({
            id: '',
            command: 'ls -la',
            output: expect.stringContaining('API request failed'),
            status: 'failed',
        });

        expect(result.current.isExecuting).toBe(false);
    });

    it('should clear output on command', async () => {
        mockExecute.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            output: 'Command output',
            status: 'completed',
            exitCode: 0,
        });

        const { result } = renderHook(() => useShellCommand());

        await act(async () => {
            await result.current.executeCommand('echo test');
        });

        expect(result.current.activeCommand).not.toBeNull();

        act(() => {
            result.current.clearOutput();
        });

        expect(result.current.activeCommand).toBeNull();
    });

    it('should set isExecuting to true during command execution', async () => {
        let resolveMock: (value: any) => void;

        mockExecute.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveMock = resolve;
                }),
        );

        const { result } = renderHook(() => useShellCommand());

        // Start command without awaiting - just fire it off
        act(() => {
            result.current.executeCommand('sleep 1');
        });

        // Immediately after starting, isExecuting should be true
        // Note: In bun's React test environment, state updates may be synchronous
        // so we check it immediately after triggering
        expect(result.current.isExecuting).toBe(true);

        // Resolve to complete the command
        await act(async () => {
            resolveMock!({
                id: 'test-id',
                pid: 12345,
                output: '',
                status: 'completed',
                exitCode: 0,
            });
        });

        expect(result.current.isExecuting).toBe(false);
    });
});
