/**
 * SkillsPanel 主组件
 */

import { useState, useMemo } from 'react';
import type { Skill } from '../../../types/index.js';
import { trpc } from '../../../api.js';
import { ErrorDisplay, EmptyState } from '../../ErrorDisplay.js';

type FilterType = 'all' | 'user' | 'project';

export function SkillsPanel() {
    const [filter, setFilter] = useState<FilterType>('all');

    const { data: skills = [], isLoading, error } = trpc.skills.list.useQuery();

    // 前端筛选
    const filteredSkills = useMemo(() => {
        if (filter === 'all') {
            return skills;
        }
        return skills.filter((s) => s.source === filter);
    }, [skills, filter]);

    const getSourceBadge = (source: string) => {
        return source === 'project' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                Project
            </span>
        ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                User
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Skills ({skills.length})</h2>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterType)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Sources</option>
                    <option value="user">User Only</option>
                    <option value="project">Project Only</option>
                </select>
            </div>

            {error && <ErrorDisplay error={error.message} onRetry={() => {}} />}

            {!isLoading && !error && filteredSkills.length === 0 && (
                <EmptyState
                    message={
                        skills.length === 0
                            ? 'No skills found. Add skills to your user or project skills directory.'
                            : `No ${filter} skills found.`
                    }
                />
            )}

            {!isLoading && !error && filteredSkills.length > 0 && (
                <div className="grid gap-4">
                    {filteredSkills.map((skill) => (
                        <div
                            key={skill.name}
                            className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">{skill.name}</h3>
                                        {getSourceBadge(skill.source)}
                                    </div>
                                    <p className="text-gray-600 text-sm mb-3">{skill.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span>📁 {skill.path}</span>
                                        {skill.license && <span>📜 {skill.license}</span>}
                                    </div>
                                </div>
                            </div>

                            {skill.metadata && Object.keys(skill.metadata).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <span className="text-xs text-gray-400 font-medium">Metadata:</span>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {Object.entries(skill.metadata).map(([key, value]) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                                            >
                                                <span className="text-gray-400">{key}:</span> {value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {skill.allowed_tools && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <span className="text-xs text-gray-400 font-medium">Allowed Tools:</span>
                                    <code className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-blue-600">
                                        {skill.allowed_tools}
                                    </code>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
