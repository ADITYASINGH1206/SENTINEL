import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Heart, MessageCircle, UserPlus, Share } from 'lucide-react';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndMark = async () => {
            try {
                const data = await apiFetch('/api/v1/notifications');
                if (data.success) {
                    setNotifications(data.notifications);
                }
                // Mark as read asynchronously
                apiFetch('/api/v1/notifications/read', { method: 'PUT' }).catch(console.error);
            } catch(err) {
                console.error("Failed to load notifications", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAndMark();
    }, []);

    const getIcon = (type) => {
        switch(type) {
            case 'like': return <Heart className="text-pink-500 fill-pink-500" size={24} />;
            case 'comment': return <MessageCircle className="text-blue-500 fill-blue-500" size={24} />;
            case 'follow': return <UserPlus className="text-purple-500" size={24} />;
            case 'repost': return <Share className="text-green-500" size={24} />;
            case 'verification': return <span className="text-2xl">🤖</span>;
            default: return null;
        }
    };

    const getMessage = (n) => {
        const name = n.notifier?.display_name || n.notifier?.username || 'Someone';
        switch(n.type) {
            case 'like': return <span><span className="font-bold">{name}</span> liked your post.</span>;
            case 'comment': return <span><span className="font-bold">{name}</span> commented on your post.</span>;
            case 'follow': return <span><span className="font-bold">{name}</span> started following you.</span>;
            case 'repost': return <span><span className="font-bold">{name}</span> reposted your post.</span>;
            case 'verification': return <span className="font-bold">Your post has been AI verified.</span>;
            default: return null;
        }
    };

    return (
        <div className="w-full min-h-screen">
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Notifications</h1>
            </div>
            {loading ? (
                <div className="p-4 flex flex-col gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 animate-pulse rounded-lg" />)}
                </div>
            ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No notifications yet.</div>
            ) : (
                <div>
                    {notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-gray-800 flex gap-4 hover:bg-gray-800/30 transition ${n.is_read ? 'bg-transparent' : 'bg-blue-900/10'}`}>
                            <div className="w-10 flex justify-end pt-1">{getIcon(n.type)}</div>
                            <div className="flex-grow">
                                {n.notifier && (
                                    <img src={n.notifier.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + n.notifier.username} className="w-8 h-8 rounded-full mb-2 bg-gray-700" alt="avatar" />
                                )}
                                <p className="text-[15px]">{getMessage(n)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
