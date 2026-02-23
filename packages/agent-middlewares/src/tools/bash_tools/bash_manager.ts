import type { ResultPromise } from 'execa';

export interface ManagedProcess {
    process: ResultPromise;
    stdout: string[];
    stderr: string[];
}

export const background_processes = new Map<number, ManagedProcess>();
