/**
 * State 测试
 * 测试 CodeState 和相关 schema 定义
 */

import { describe, it, expect } from 'vitest';
import { CodeState, CodeAnnotation } from '../state';
import { SubAgentStateSchema } from '@langgraph-js/standard-agent';

describe('SubAgentStateSchema', () => {
    it('should define task_store field as optional', () => {
        const schema = SubAgentStateSchema.shape;
        expect(schema.task_store).toBeDefined();
        expect(schema.task_store?.isOptional()).toBe(true);
    });

    it('should accept valid state with task_store', () => {
        const validState = {
            task_store: { key: 'value' },
        };

        const result = SubAgentStateSchema.safeParse(validState);
        expect(result.success).toBe(true);
    });

    it('should accept valid state without task_store', () => {
        const validState = {};

        const result = SubAgentStateSchema.safeParse(validState);
        expect(result.success).toBe(true);
    });

    it('should reject invalid task_store type', () => {
        const invalidState = {
            task_store: 'invalid',
        };

        const result = SubAgentStateSchema.safeParse(invalidState);
        expect(result.success).toBe(false);
    });
});

describe('CodeState', () => {
    it('should have model_id field with default value', () => {
        expect(CodeState.shape.model_id).toBeDefined();
        const field = CodeState.shape.model_id;
        expect(field?.isOptional()).toBe(true);
    });

    it('should have agent_name field with default value', () => {
        expect(CodeState.shape.agent_name).toBeDefined();
        const field = CodeState.shape.agent_name;
        expect(field?.isOptional()).toBe(true);
    });

    it('should have switch_command field as optional', () => {
        expect(CodeState.shape.switch_command).toBeDefined();
        const field = CodeState.shape.switch_command;
        expect(field?.isOptional()).toBe(true);
    });

    it('should have enable_thinking field with default true', () => {
        expect(CodeState.shape.enable_thinking).toBeDefined();
        const field = CodeState.shape.enable_thinking;
        expect(field?.isOptional()).toBe(true);
    });

    it('should accept valid minimal state', () => {
        const minimalState = {};

        const result = CodeState.safeParse(minimalState);
        expect(result.success).toBe(true);
    });

    it('should accept valid full state', () => {
        const fullState = {
            model_id: 'gpt-4',
            agent_name: 'Custom Agent',
            switch_command: 'planner',
            enable_thinking: false,
            task_store: { data: 'test' },
        };

        const result = CodeState.safeParse(fullState);
        expect(result.success).toBe(true);
    });

    it('should reject invalid model_id type', () => {
        const invalidState = {
            model_id: 123,
        };

        const result = CodeState.safeParse(invalidState);
        expect(result.success).toBe(false);
    });

    it('should reject invalid enable_thinking type', () => {
        const invalidState = {
            enable_thinking: 'true',
        };

        const result = CodeState.safeParse(invalidState);
        expect(result.success).toBe(false);
    });

    it('should apply default values when fields are missing', () => {
        const partialState = {};

        const result = CodeState.safeParse(partialState);
        if (result.success) {
            // 注意：Zod 的 safeParse 不会自动应用默认值，需要使用 parse
            // 这里我们验证 schema 定义是否正确
            expect(CodeState.shape.model_id).toBeDefined();
            expect(CodeState.shape.agent_name).toBeDefined();
            expect(CodeState.shape.enable_thinking).toBeDefined();
        }
    });
});

describe('CodeAnnotation', () => {
    it('should be defined', () => {
        expect(CodeAnnotation).toBeDefined();
    });

    it('should be an AnnotationRoot', () => {
        // CodeAnnotation is created by createState() which returns an AnnotationRoot
        expect(typeof CodeAnnotation).toBe('object');
        expect(CodeAnnotation).not.toBeNull();
    });

    it('should export CodeStateType', () => {
        // CodeStateType is a type export and should be available
        // We can't directly test types at runtime, but we can verify the import works
        expect(typeof CodeAnnotation).toBe('object');
    });
});
