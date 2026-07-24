import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { PostCard } from '../components/PostComponents';
import { Bookmark, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Bookmarks() {
    const { user } = useAuth();
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookmarks = async () => {
            try {
                const res = await apiFetch('/api/v1/bookmarks');
                if (res.success) {
                    // Inject is_bookmarked locally so they render properly
                    const mapped = res.posts.map(p => ({...p, is_bookmarked: true}));
                    setBookmarks(mapped);
                }
            } catch (err) {
                console.error("Failed to fetch bookmarks:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookmarks();
    }, []);

    return (
        <div className="w-full min-h-screen bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white">
            <div className="sticky top-0 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 z-10 flex flex-col justify-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                </div>
            ) : bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                        <Bookmark className="h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">No Bookmarks Saved Yet</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                        Save posts to easily find them again later. Click the bookmark icon on any post to add it here.
                    </p>
                </div>
            ) : (
                <div className="pb-20">
                    {bookmarks.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}
