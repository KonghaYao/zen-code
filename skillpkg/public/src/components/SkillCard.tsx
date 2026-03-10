import { Link } from 'react-router-dom';
import type { Skill } from '../api.js';

interface Props {
    skill: Skill;
}

export function SkillCard({ skill }: Props) {
    return (
        <Link
            to={`/skills/${encodeURIComponent(skill.name)}`}
            className="group block bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl p-5 transition-all hover:bg-gray-900/80"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono font-semibold text-white group-hover:text-indigo-300 transition truncate">
                            {skill.name}
                        </span>
                        {skill.latest_version && (
                            <span className="shrink-0 text-xs text-gray-500 font-mono">v{skill.latest_version}</span>
                        )}
                    </div>
                    {skill.description && <p className="text-sm text-gray-400 line-clamp-2">{skill.description}</p>}
                    {skill.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {skill.keywords.slice(0, 4).map((kw) => (
                                <span key={kw} className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-300">
                        {skill.downloads_total > 1000
                            ? `${(skill.downloads_total / 1000).toFixed(1)}k`
                            : skill.downloads_total}
                    </div>
                    <div className="text-xs text-gray-600">↓</div>
                </div>
            </div>
        </Link>
    );
}
