/**
 * State Machine UI Store
 *
 * Zustand store for SM page state management
 */

import { create } from 'zustand';

// ========================================
// Types (local definitions to avoid backend dependency)
// ========================================

export interface StateMachineDefinition {
    id: string;
    name: string;
    description?: string;
    initial: string;
    states: Record<string, StateNodeDefinition>;
    context?: Record<string, unknown>;
    on?: Record<string, TransitionDefinition | TransitionDefinition[]>;
    meta?: {
        version?: string;
        author?: string;
        tags?: string[];
        [key: string]: unknown;
    };
}

export interface StateNodeDefinition {
    id?: string;
    type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    initial?: string;
    states?: Record<string, StateNodeDefinition>;
    on?: Record<string, TransitionDefinition | TransitionDefinition[]>;
    entry?: ActionDefinition | ActionDefinition[];
    exit?: ActionDefinition | ActionDefinition[];
    meta?: Record<string, unknown>;
}

export interface TransitionDefinition {
    target: string;
    event?: string;
    guard?: string;
    actions?: ActionDefinition | ActionDefinition[];
}

export interface ActionDefinition {
    type: string;
    params?: Record<string, unknown>;
}

export interface StateInstance {
    state_id: string;
    machine_id: string;
    current_state: string;
    context: Record<string, unknown>;
    status: 'active' | 'completed' | 'failed' | 'paused';
    parent_state_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface SMState {
    // Selection state
    selectedMachineId: string | null;
    selectedStateId: string | null;

    // Edit state
    editingMachine: StateMachineDefinition | null;
    isEditing: boolean;
    isCreating: boolean;

    // UI state
    sidebarTab: 'definitions' | 'instances';
    expandedNodes: Set<string>;

    // Actions
    selectMachine: (machineId: string | null) => void;
    selectState: (stateId: string | null) => void;
    setEditingMachine: (machine: StateMachineDefinition | null) => void;
    setIsEditing: (isEditing: boolean) => void;
    setIsCreating: (isCreating: boolean) => void;
    setSidebarTab: (tab: 'definitions' | 'instances') => void;
    toggleNode: (nodeId: string) => void;
    expandNode: (nodeId: string) => void;
    collapseNode: (nodeId: string) => void;
    reset: () => void;
}

// ========================================
// Initial State
// ========================================

const initialState = {
    selectedMachineId: null,
    selectedStateId: null,
    editingMachine: null,
    isEditing: false,
    isCreating: false,
    sidebarTab: 'definitions' as const,
    expandedNodes: new Set<string>(),
};

// ========================================
// Store
// ========================================

export const useSMStore = create<SMState>((set) => ({
    ...initialState,

    selectMachine: (machineId) =>
        set({
            selectedMachineId: machineId,
            selectedStateId: null, // Clear state selection when switching machines
            isCreating: false, // Exit creating mode when selecting a machine
        }),

    selectState: (stateId) => set({ selectedStateId: stateId }),

    setEditingMachine: (machine) => set({ editingMachine: machine }),

    setIsEditing: (isEditing) => set({ isEditing }),

    setIsCreating: (isCreating) =>
        set({
            isCreating,
            editingMachine: isCreating
                ? {
                      id: '',
                      name: 'New Machine',
                      initial: '',
                      states: {},
                  }
                : null,
        }),

    setSidebarTab: (tab) =>
        set({
            sidebarTab: tab,
            selectedStateId: null,
        }),

    toggleNode: (nodeId) =>
        set((state) => {
            const expandedNodes = new Set(state.expandedNodes);
            if (expandedNodes.has(nodeId)) {
                expandedNodes.delete(nodeId);
            } else {
                expandedNodes.add(nodeId);
            }
            return { expandedNodes };
        }),

    expandNode: (nodeId) =>
        set((state) => {
            const expandedNodes = new Set(state.expandedNodes);
            expandedNodes.add(nodeId);
            return { expandedNodes };
        }),

    collapseNode: (nodeId) =>
        set((state) => {
            const expandedNodes = new Set(state.expandedNodes);
            expandedNodes.delete(nodeId);
            return { expandedNodes };
        }),

    reset: () => set(initialState),
}));

// ========================================
// Selectors
// ========================================

export const selectSelectedMachineId = (state: SMState) => state.selectedMachineId;
export const selectSelectedStateId = (state: SMState) => state.selectedStateId;
export const selectEditingMachine = (state: SMState) => state.editingMachine;
export const selectIsEditing = (state: SMState) => state.isEditing;
export const selectIsCreating = (state: SMState) => state.isCreating;
export const selectSidebarTab = (state: SMState) => state.sidebarTab;
export const selectExpandedNodes = (state: SMState) => state.expandedNodes;
