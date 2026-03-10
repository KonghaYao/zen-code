import { useState, useEffect, useCallback } from 'react';
import { searchSkills, type Skill } from '../api.js';
import { SkillCard } from '../components/SkillCard.js';

export function Home() {
    const [query, setQuery] = useState('');
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const doSearch = useCallback(async (q: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await searchSkills(q);
            setSkills(result.skills ?? result.results ?? []);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        doSearch('');
    }, [doSearch]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        doSearch(query);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Hero */}
            <div className="bg-gradient-to-b from-indigo-950 to-gray-950 py-24 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-6">
                        <span>📦</span> AI Skill Package Registry
                    </div>
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                        SkillPkg
                    </h1>
                    <p className="text-xl text-gray-400 mb-10">
                        The open registry for Claude / LangGraph AI Skills.
                        <br />
                        Publish, share, and install skills with one command.
                    </p>
                    <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search skills... e.g. codebase-exploration"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition"
                        >
                            Search
                        </button>
                    </form>
                    <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
                        <code className="bg-gray-800 px-3 py-1 rounded-lg">skill install codebase-exploration</code>
                        <span>·</span>
                        <code className="bg-gray-800 px-3 py-1 rounded-lg">skill publish</code>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-5xl mx-auto px-4 py-12">
                {error && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-8 text-red-300">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-300">
                        {query ? `Results for "${query}"` : 'Popular Skills'}
                    </h2>
                    <span className="text-sm text-gray-500">{skills.length} skills</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-32 animate-pulse" />
                        ))}
                    </div>
                ) : skills.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-4xl mb-3">📭</div>
                        <div>No skills found{query ? ` for "${query}"` : ''}</div>
                        {query && (
                            <div className="mt-2 text-sm">
                                <span>Publish one: </span>
                                <code className="bg-gray-800 px-2 py-0.5 rounded">skill publish</code>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skills.map((skill) => (
                            <SkillCard key={skill.id} skill={skill} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
