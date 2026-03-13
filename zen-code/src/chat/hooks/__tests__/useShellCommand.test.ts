/**
 * useShellCommand Hook Tests
 *
 * Tests for shell command execution and state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShellCommand } from '../useShellCommand';

// Mock tRPC context
const mockExec = vi.fn();
vi.mock('../../context/ZenCoreContext', () => ({
    useTrpc: () => ({
        processes: {
            exec: {
                mutate: mockExec,
            },
        },
    }),
}));

describe('useShellCommand', () => {
    beforeEach(() => {
        mockExec.mockClear();
    });

    it('should execute shell command successfully', async () => {
        mockExec.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            stdout: 'Command output',
            stderr: '',
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
        expect(mockExec).not.toHaveBeenCalled();
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

        expect(mockExec).not.toHaveBeenCalled();
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

        expect(mockExec).not.toHaveBeenCalled();
    });

    it('should allow non-interactive git commands', async () => {
        mockExec.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            stdout: 'Commit created',
            stderr: '',
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

        expect(mockExec).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
        mockExec.mockRejectedValueOnce(new Error('API request failed: Internal Server Error'));

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
        mockExec.mockResolvedValueOnce({
            id: 'test-id',
            pid: 12345,
            stdout: 'Command output',
            stderr: '',
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

        mockExec.mockImplementationOnce(
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
                stdout: '',
                stderr: '',
                status: 'completed',
                exitCode: 0,
            });
        });

        expect(result.current.isExecuting).toBe(false);
    });
});
