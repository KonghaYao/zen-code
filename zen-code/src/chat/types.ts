export interface Message {
    content: string;
    role: string;
    name?: string;
    metadata?: {
        graph_id?: string;
    };
    thread_id?: string;
    usage_metadata?: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
    };
    spend_time?: number;
    tool_input?: string;
}

export interface ProcessInfo {
    pid: number;
    command: string;
    startTime: number;
    duration: number; // 运行时长 (ms)
    cpu: number; // CPU 使用率 (%)
    memory: number; // 内存使用率 (bytes)
    status: 'running' | 'stopped' | 'zombie';
}
