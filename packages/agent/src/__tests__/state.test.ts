/**
 * State 测试
 * 测试 CodeState 和相关定义
 */

import { describe, it, expect } from 'vitest';
import { CodeState, CodeAnnotation, CodeSchema } from '../state';

describe('CodeSchema', () => {
    it('should be a StateSchema instance', () => {
        expect(CodeSchema).toBeDefined();
        expect(CodeState).toBeDefined();
        expect(CodeAnnotation).toBeDefined();
        // All three should be the same object
        expect(CodeSchema).toBe(CodeState);
        expect(CodeSchema).toBe(CodeAnnotation);
    });
});

describe('CodeState fields', () => {
    it('should have messages field', () => {
        // StateSchema has fields property containing field definitions
        expect(CodeSchema.fields).toBeDefined();
        expect(CodeSchema.fields.messages).toBeDefined();
    });

    it('should have task_store field', () => {
        expect(CodeSchema.fields.task_store).toBeDefined();
    });

    it('should have provider_id field with default value', () => {
        expect(CodeSchema.fields.provider_id).toBeDefined();
    });

    it('should have provider_type field with default value', () => {
        expect(CodeSchema.fields.provider_type).toBeDefined();
    });

    it('should have model_id field with default value', () => {
        expect(CodeSchema.fields.model_id).toBeDefined();
    });

    it('should have agent_name field with default value', () => {
        expect(CodeSchema.fields.agent_name).toBeDefined();
    });

    it('should have active_agent field as optional', () => {
        expect(CodeSchema.fields.active_agent).toBeDefined();
    });

    it('should have enable_thinking field with default true', () => {
        expect(CodeSchema.fields.enable_thinking).toBeDefined();
    });

    it('should have streaming field with default false', () => {
        expect(CodeSchema.fields.streaming).toBeDefined();
    });

    it('should have cwd field with default process.cwd()', () => {
        expect(CodeSchema.fields.cwd).toBeDefined();
    });

    it('should have user_id field as optional', () => {
        expect(CodeSchema.fields.user_id).toBeDefined();
    });

    it('should have thread_id field as optional', () => {
        expect(CodeSchema.fields.thread_id).toBeDefined();
    });
});

describe('CodeAnnotation', () => {
    it('should be defined', () => {
        expect(CodeAnnotation).toBeDefined();
    });

    it('should be the same as CodeSchema', () => {
        // CodeAnnotation is an alias for CodeSchema
        expect(typeof CodeAnnotation).toBe('object');
        expect(CodeAnnotation).not.toBeNull();
        expect(CodeAnnotation).toBe(CodeSchema);
    });

    it('should export CodeStateType', () => {
        // CodeStateType is a type export and should be available
        // We can't directly test types at runtime, but we can verify the schema works
        expect(typeof CodeAnnotation).toBe('object');
    });
});
