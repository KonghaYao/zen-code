/**
 * useShellCommand Hook Tests
 *
 * Tests for shell command execution and state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShellCommand } from '../useShellCommand';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('useShellCommand', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('should execute shell command successfully', async () => {
        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test-id',
                pid: 12345,
                output: 'Command output',
                status: 'completed',
                exitCode: 0,
            }),
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
            const response = await result.current.executeCommand('   ');
        });

        expect(result.current.activeCommand).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
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

        expect(mockFetch).not.toHaveBeenCalled();
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

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should allow non-interactive git commands', async () => {
        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test-id',
                pid: 12345,
                output: 'Commit created',
                status: 'completed',
                exitCode: 0,
            }),
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

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
        // Mock failed API response
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
        });

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
        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'test-id',
                pid: 12345,
                output: 'Command output',
                status: 'completed',
                exitCode: 0,
            }),
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
        let resolveFetch: (value: any) => void;

        // Mock delayed API response
        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
        );

        const { result } = renderHook(() => useShellCommand());

        const executePromise = act(async () => {
            await result.current.executeCommand('sleep 1');
        });

        // Check that isExecuting is true while command is running
        expect(result.current.isExecuting).toBe(true);

        // Resolve to complete the command
        resolveFetch!({
            ok: true,
            json: async () => ({
                id: 'test-id',
                pid: 12345,
                output: '',
                status: 'completed',
                exitCode: 0,
            }),
        });

        await executePromise;

        expect(result.current.isExecuting).toBe(false);
    });
});
