/**
 * Graph Builder 测试
 * 测试 LangGraph 构建和编译
 */

import { describe, it, expect } from 'vitest';
import { createCodeGraph, graph } from '../graphBuilder';

describe('createCodeGraph', () => {
    it('should create a graph instance', () => {
        const g = createCodeGraph();
        expect(g).toBeDefined();
        expect(g).toHaveProperty('invoke');
    });

    it('should have compiled graph with invoke method', () => {
        const g = createCodeGraph();
        expect(typeof g.invoke).toBe('function');
    });
});

describe('graph (singleton)', () => {
    it('should export a singleton graph instance', () => {
        expect(graph).toBeDefined();
        expect(graph).toHaveProperty('invoke');
    });

    it('should have same structure as createCodeGraph result', () => {
        const newGraph = createCodeGraph();
        // Both should be compiled StateGraph instances with invoke method
        expect(graph).toHaveProperty('invoke');
        expect(newGraph).toHaveProperty('invoke');
        expect(typeof graph.invoke).toBe('function');
        expect(typeof newGraph.invoke).toBe('function');
    });
});

describe('error handling', () => {
    it('should throw error for unknown agent', async () => {
        const g = createCodeGraph();
        const state = {
            messages: [],
            active_agent: 'unknown_agent',
        };

        await expect(g.invoke(state, { recursionLimit: 10 })).rejects.toThrow('Unknown agent');
    });

    it('should throw error for smart_memory (removed)', async () => {
        const g = createCodeGraph();
        const state = {
            messages: [],
            active_agent: 'smart_memory',
        };

        // smart_memory branch has been removed
        await expect(g.invoke(state, { recursionLimit: 10 })).rejects.toThrow('Unknown agent');
    });
});
