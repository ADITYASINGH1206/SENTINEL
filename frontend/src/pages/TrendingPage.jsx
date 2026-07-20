import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { PostCard } from '../components/PostComponents';

export default function TrendingPage() {
    const [trends, setTrends] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTrending = async () => {
            try {
                const res = await apiFetch('/api/v1/trending');
                if (res.success) {
                    setTrends(res.hashtags);
                    setPosts(res.posts);
                }
            } catch(err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadTrending();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading trends...</div>;
    }

    return (
        <div className="w-full min-h-screen flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 p-4">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Trending Topics</h1>
                <div className="space-y-6">
                    {trends.length === 0 ? <p className="text-gray-500">No trends yet.</p> : trends.map((t, i) => (
                        <div key={i} className="group cursor-pointer">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Trending</p>
                            <p className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-500">{t.tag}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.count} posts</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-2/3">
                <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">High Engagement</h2>
                </div>
                <div>
                    {posts.length === 0 ? <p className="p-8 text-gray-500 text-center">No posts yet.</p> : posts.map(p => <PostCard key={p.id} post={p} />)}
                </div>
            </div>
        </div>
    );
}
