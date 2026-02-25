/**
 * State Machine Hooks
 *
 * React hooks for state machine management using tRPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api.js';
import type { StateMachineDefinition } from '../stores/smStore.js';

// SM API client with type assertion (sm router is added at runtime by server)
const smApi = (apiClient as any).sm;

// ========================================
// Query Keys
// ========================================

export const smKeys = {
    all: ['sm'] as const,
    definitions: () => [...smKeys.all, 'definitions'] as const,
    definition: (machineId: string) => [...smKeys.all, 'definition', machineId] as const,
    instances: (machineId?: string) => [...smKeys.all, 'instances', machineId] as const,
    instance: (stateId: string, machineId: string) => [...smKeys.all, 'instance', stateId, machineId] as const,
    history: (stateId: string) => [...smKeys.all, 'history', stateId] as const,
};

// ========================================
// Definitions Hooks
// ========================================

/**
 * 获取所有状态机定义
 */
export function useSMDefinitions() {
    return useQuery({
        queryKey: smKeys.definitions(),
        queryFn: () => smApi.listDefinitions.query(),
    });
}

/**
 * 获取单个状态机定义
 */
export function useSMDefinition(machineId: string | null | undefined) {
    return useQuery({
        queryKey: smKeys.definition(machineId!),
        queryFn: () => smApi.getDefinition.query({ machine_id: machineId! }),
        enabled: !!machineId,
    });
}

/**
 * 创建状态机定义
 */
export function useCreateSMDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (definition: StateMachineDefinition) => smApi.createDefinition.mutate(definition),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smKeys.definitions() });
        },
    });
}

/**
 * 更新状态机定义
 */
export function useUpdateSMDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ machineId, definition }: { machineId: string; definition: StateMachineDefinition }) =>
            smApi.updateDefinition.mutate({ machine_id: machineId, definition }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smKeys.definitions() });
            queryClient.invalidateQueries({ queryKey: smKeys.definition(variables.machineId) });
        },
    });
}

/**
 * 删除状态机定义
 */
export function useDeleteSMDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (machineId: string) => smApi.deleteDefinition.mutate({ machine_id: machineId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smKeys.definitions() });
        },
    });
}

// ========================================
// Instances Hooks
// ========================================

/**
 * 获取状态实例列表
 */
export function useSMInstances(machineId?: string) {
    return useQuery({
        queryKey: smKeys.instances(machineId),
        queryFn: () => smApi.listInstances.query({ machine_id: machineId }),
    });
}

/**
 * 获取单个状态实例详情
 */
export function useSMInstance(stateId: string | null | undefined, machineId: string | null | undefined) {
    return useQuery({
        queryKey: smKeys.instance(stateId!, machineId!),
        queryFn: () => smApi.getInstance.query({ state_id: stateId!, machine_id: machineId! }),
        enabled: !!stateId && !!machineId,
    });
}

/**
 * 创建状态实例
 */
export function useCreateSMInstance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            state_id: string;
            machine_id: string;
            initial_context?: Record<string, unknown>;
            parent_state_id?: string;
        }) => smApi.createInstance.mutate(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smKeys.instances(variables.machine_id) });
        },
    });
}

/**
 * 删除状态实例
 */
export function useDeleteSMInstance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (stateId: string) => smApi.deleteInstance.mutate({ state_id: stateId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: smKeys.instances() });
        },
    });
}

// ========================================
// Transitions Hooks
// ========================================

/**
 * 获取转换历史
 */
export function useSMHistory(stateId: string | null | undefined, limit: number = 50) {
    return useQuery({
        queryKey: smKeys.history(stateId!),
        queryFn: () => smApi.getHistory.query({ state_id: stateId!, limit }),
        enabled: !!stateId,
    });
}

/**
 * 执行状态转换
 */
export function useSMTransition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            state_id: string;
            machine_id: string;
            target_state: string;
            event_payload?: Record<string, unknown>;
        }) => smApi.transitionTo.mutate(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smKeys.instance(variables.state_id, variables.machine_id) });
            queryClient.invalidateQueries({ queryKey: smKeys.history(variables.state_id) });
            queryClient.invalidateQueries({ queryKey: smKeys.instances() });
        },
    });
}

/**
 * 发送事件触发转换
 */
export function useSMSendEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            state_id: string;
            machine_id: string;
            event_name: string;
            event_payload?: Record<string, unknown>;
        }) => smApi.sendEvent.mutate(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smKeys.instance(variables.state_id, variables.machine_id) });
            queryClient.invalidateQueries({ queryKey: smKeys.history(variables.state_id) });
            queryClient.invalidateQueries({ queryKey: smKeys.instances() });
        },
    });
}

/**
 * 回滚到之前的状态
 */
export function useSMRollback() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: { state_id: string; transition_id: number }) => smApi.rollback.mutate(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smKeys.history(variables.state_id) });
            queryClient.invalidateQueries({ queryKey: smKeys.instances() });
        },
    });
}
