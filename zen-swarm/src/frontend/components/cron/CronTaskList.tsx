/**
 * CronTaskList 组件 - Cron 任务列表
 */

import type { CronTask, CronLog } from '../../types/cron.js';
import { CronTaskCard } from './CronTaskCard.js';

interface CronTaskListProps {
    tasks: CronTask[];
    agentMap: Map<string, { name: string }>;
    lastLogMap: Map<string, CronLog>;
    onEdit: (task: CronTask) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onTrigger: (id: string) => void;
}

export function CronTaskList(props: CronTaskListProps) {
    const { tasks, agentMap, lastLogMap, onEdit, onDelete, onToggle, onTrigger } = props;

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
                <p className="text-4xl mb-4">⏰</p>
                <p className="text-lg">No cron tasks yet</p>
                <p className="text-sm mt-2">Click "New Task" to create your first scheduled task</p>
            </div>
        );
    }

    // 分组：启用的和禁用的
    const enabledTasks = tasks.filter((t) => t.enabled);
    const disabledTasks = tasks.filter((t) => !t.enabled);

    return (
        <div className="space-y-6">
            {/* 启用的任务 */}
            {enabledTasks.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                        Enabled Tasks ({enabledTasks.length})
                    </h3>
                    <div className="space-y-3">
                        {enabledTasks.map((task) => (
                            <CronTaskCard
                                key={task.id}
                                task={task}
                                agentName={agentMap.get(task.agent_id)?.name}
                                lastLogStatus={lastLogMap.get(task.id)?.status}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggle={onToggle}
                                onTrigger={onTrigger}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 禁用的任务 */}
            {disabledTasks.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                        Disabled Tasks ({disabledTasks.length})
                    </h3>
                    <div className="space-y-3">
                        {disabledTasks.map((task) => (
                            <CronTaskCard
                                key={task.id}
                                task={task}
                                agentName={agentMap.get(task.agent_id)?.name}
                                lastLogStatus={lastLogMap.get(task.id)?.status}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggle={onToggle}
                                onTrigger={onTrigger}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
