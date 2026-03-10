import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSkill, type Skill, type SkillVersion } from '../api.js';

function VersionBadge({ version, deprecated }: { version: string; deprecated: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${
                deprecated
                    ? 'bg-red-900/30 text-red-400 border border-red-800'
                    : 'bg-indigo-900/30 text-indigo-300 border border-indigo-800'
            }`}
        >
            v{version}
            {deprecated && <span className="text-red-500">⚠</span>}
        </span>
    );
}

export function SkillDetail() {
    const { name } = useParams<{ name: string }>();
    const [skill, setSkill] = useState<Skill | null>(null);
    const [versions, setVersions] = useState<SkillVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!name) return;
        getSkill(name)
            .then(({ skill, versions }) => {
                setSkill(skill);
                setVersions(versions);
            })
            .catch((e) => setError((e as Error).message))
            .finally(() => setLoading(false));
    }, [name]);

    const copyInstall = () => {
        navigator.clipboard.writeText(`skill install ${name}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-gray-500 animate-pulse">Loading...</div>
            </div>
        );
    }

    if (error || !skill) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-3">😕</div>
                    <div className="text-gray-400">{error ?? 'Skill not found'}</div>
                    <Link to="/" className="text-indigo-400 hover:text-indigo-300 mt-4 block text-sm">
                        ← Back to registry
                    </Link>
                </div>
            </div>
        );
    }

    const latestVersion = versions.find((v) => v.version === skill.latest_version) ?? versions[0];

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <div className="border-b border-gray-800 bg-gray-900/50">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 block">
                        ← Back to registry
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold font-mono">{skill.name}</h1>
                            {skill.description && <p className="text-gray-400 mt-1">{skill.description}</p>}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {skill.keywords.map((kw) => (
                                    <span key={kw} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-2xl font-bold text-indigo-400">
                                {skill.downloads_total.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">downloads</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: README */}
                <div className="md:col-span-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">README</h2>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        {latestVersion?.readme ? (
                            <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                {latestVersion.readme}
                            </pre>
                        ) : (
                            <div className="text-gray-500 text-sm">No README available.</div>
                        )}
                    </div>
                </div>

                {/* Right: sidebar */}
                <div className="space-y-6">
                    {/* Install */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Install</h3>
                        <button
                            onClick={copyInstall}
                            className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2.5 font-mono text-sm text-left flex items-center justify-between transition"
                        >
                            <span className="text-indigo-300">skill install {skill.name}</span>
                            <span className="text-gray-500 text-xs">{copied ? '✓' : '⎘'}</span>
                        </button>
                    </div>

                    {/* Info */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Info</h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Latest</span>
                            <span className="font-mono text-indigo-300">{skill.latest_version ?? '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Published</span>
                            <span className="text-gray-300">{new Date(skill.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Updated</span>
                            <span className="text-gray-300">{new Date(skill.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Versions */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Versions ({versions.length})
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {versions.map((v) => (
                                <div key={v.id} className="flex items-center justify-between text-xs">
                                    <VersionBadge version={v.version} deprecated={v.deprecated} />
                                    <span className="text-gray-600">
                                        {new Date(v.published_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
