import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDbPath, initDatabaseUri, getDefaultDatabasePath, checkDbSize, getDbStatus } from './dbPath';

describe('dbPath utils', () => {
    const tempDir = path.join(os.tmpdir(), 'dbPath-test');
    const testDbPath = path.join(tempDir, 'session.db');

    beforeEach(() => {
        // 清理环境变量
        delete process.env.SQLITE_DATABASE_URI;
        delete process.env.SQLITE_MAX_SIZE_MB;

        // 清理测试目录
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    afterEach(() => {
        delete process.env.SQLITE_DATABASE_URI;
        delete process.env.SQLITE_MAX_SIZE_MB;

        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    describe('initDbPath', () => {
        it('should expand tilde to home directory', () => {
            const result = initDbPath('~/test.db');
            const expected = path.join(os.homedir(), 'test.db');
            expect(result).toBe(expected);
        });

        it('should handle absolute paths', () => {
            const result = initDbPath(testDbPath);
            expect(result).toBe(testDbPath);
        });

        it('should handle relative paths', () => {
            const relativePath = './data/test.db';
            const result = initDbPath(relativePath);
            const expected = path.resolve(relativePath);
            expect(result).toBe(expected);
        });

        it('should create directory if not exists', () => {
            const result = initDbPath(testDbPath);
            expect(fs.existsSync(path.dirname(result))).toBe(true);
        });

        it('should not throw if directory already exists', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            expect(() => initDbPath(testDbPath)).not.toThrow();
        });
    });

    describe('checkDbSize', () => {
        it('should not warn if file does not exist', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn');
            checkDbSize('/non/existent/path.db');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should not warn if file is under limit', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(testDbPath, 'x'.repeat(1000)); // 1KB

            const consoleWarnSpy = vi.spyOn(console, 'warn');
            checkDbSize(testDbPath, 10 * 1024 * 1024); // 10MB limit
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should warn if file exceeds limit', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const fileSize = 5 * 1024 * 1024; // 5MB
            fs.writeFileSync(testDbPath, 'x'.repeat(fileSize));

            const consoleTraceSpy = vi.spyOn(console, 'trace');
            checkDbSize(testDbPath, 1 * 1024 * 1024); // 1MB limit
            expect(consoleTraceSpy).toHaveBeenCalled();
            const traceCall = consoleTraceSpy.mock.calls[0][0] as string;
            expect(traceCall).toContain('5.00MB');
            consoleTraceSpy.mockRestore();
        });

        it('should use default limit (100MB) if no env var', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(testDbPath, 'x');

            expect(() => checkDbSize(testDbPath)).not.toThrow();
        });

        it('should use SQLITE_MAX_SIZE_MB environment variable', () => {
            process.env.SQLITE_MAX_SIZE_MB = '10'; // 10MB

            fs.mkdirSync(tempDir, { recursive: true });
            const fileSize = 15 * 1024 * 1024; // 15MB
            fs.writeFileSync(testDbPath, 'x'.repeat(fileSize));

            const consoleTraceSpy = vi.spyOn(console, 'trace');
            checkDbSize(testDbPath);
            expect(consoleTraceSpy).toHaveBeenCalled();
            const traceCall = consoleTraceSpy.mock.calls[0][0] as string;
            expect(traceCall).toContain('15.00MB');
            expect(traceCall).toContain('limit: 10.00MB');
            consoleTraceSpy.mockRestore();
        });

        it('should prioritize parameter over env var', () => {
            process.env.SQLITE_MAX_SIZE_MB = '50';

            fs.mkdirSync(tempDir, { recursive: true });
            const fileSize = 15 * 1024 * 1024;
            fs.writeFileSync(testDbPath, 'x'.repeat(fileSize));

            const consoleTraceSpy = vi.spyOn(console, 'trace');
            checkDbSize(testDbPath, 10 * 1024 * 1024); // 10MB parameter
            expect(consoleTraceSpy).toHaveBeenCalled();
            const traceCall = consoleTraceSpy.mock.calls[0][0] as string;
            expect(traceCall).toContain('limit: 10.00MB');
            consoleTraceSpy.mockRestore();
        });
    });

    describe('initDatabaseUri', () => {
        it('should set process.env.SQLITE_DATABASE_URI', () => {
            const result = initDatabaseUri(testDbPath);
            expect(process.env.SQLITE_DATABASE_URI).toBe(testDbPath);
            expect(result).toBe(testDbPath);
        });

        it('should return the same path as initDbPath', () => {
            const dbPath = initDbPath(testDbPath);
            const uriPath = initDatabaseUri(testDbPath);
            expect(uriPath).toBe(dbPath);
        });

        it('should call checkDbSize when file exists', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(testDbPath, 'x');

            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            initDatabaseUri(testDbPath);
            expect(consoleWarnSpy).not.toHaveBeenCalled(); // File is small
            consoleWarnSpy.mockRestore();
        });
    });

    describe('getDefaultDatabasePath', () => {
        let mockHomeDir: string;

        beforeEach(() => {
            mockHomeDir = path.join(os.tmpdir(), `dbPath-home-test-${Date.now()}`);
            vi.spyOn(os, 'homedir').mockReturnValue(mockHomeDir);
        });

        afterEach(() => {
            vi.restoreAllMocks();
            if (fs.existsSync(mockHomeDir)) {
                fs.rmSync(mockHomeDir, { recursive: true });
            }
        });

        it('should return ~/.zen-code/session.db', () => {
            const result = getDefaultDatabasePath();
            const expected = path.join(mockHomeDir, '.zen-code', 'session.db');
            expect(result).toBe(expected);
        });

        it('should create .zen-code directory', () => {
            getDefaultDatabasePath();
            const zenCodeDir = path.join(mockHomeDir, '.zen-code');
            expect(fs.existsSync(zenCodeDir)).toBe(true);
        });
    });

    describe('getDbStatus', () => {
        it('should return exists: false for non-existent file', () => {
            const status = getDbStatus('/non/existent/path.db');
            expect(status.exists).toBe(false);
            expect(status.size).toBeUndefined();
            expect(status.sizeInMB).toBeUndefined();
        });

        it('should return file stats for existing file', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(testDbPath, 'x'.repeat(1024)); // 1KB

            const status = getDbStatus(testDbPath);
            expect(status.exists).toBe(true);
            expect(status.size).toBe(1024);
            expect(status.sizeInMB).toBeCloseTo(0.0009765625, 6);
        });

        it('should calculate sizeInMB correctly', () => {
            fs.mkdirSync(tempDir, { recursive: true });
            const fileSize = 5 * 1024 * 1024; // 5MB
            fs.writeFileSync(testDbPath, 'x'.repeat(fileSize));

            const status = getDbStatus(testDbPath);
            expect(status.sizeInMB).toBe(5);
        });
    });

    describe('cross-platform compatibility', () => {
        it('should handle Windows paths', () => {
            const windowsPath = 'C:\\Users\\test\\data.db';
            const result = initDbPath(windowsPath);
            expect(typeof result).toBe('string');
        });

        it('should handle Unix paths with forward slashes', () => {
            const unixPath = '/tmp/test/data.db';
            const result = initDbPath(unixPath);
            expect(result).toBe(unixPath);
        });

        it('should handle mixed separators', () => {
            const mixedPath = path.join('~/test', 'data.db');
            const result = initDbPath(mixedPath);
            expect(result).toContain(path.join(os.homedir(), 'test', 'data.db'));
        });
    });
});
