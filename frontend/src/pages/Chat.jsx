import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Send, MessageCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';

export default function Chat() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const messagesEndRef = useRef(null);

    // Fetch conversations on mount
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await apiFetch('/api/v1/messages/conversations');
                if (res.success) setConversations(res.conversations);
            } catch (err) {
                console.error("Failed to fetch conversations", err);
            }
        };
        fetchConversations();
    }, []);

    // Fetch messages when a conversation is selected
    useEffect(() => {
        if (activeConversation && !activeConversation.isTemp) {
            const fetchThread = async () => {
                try {
                    const res = await apiFetch(`/api/v1/messages/thread/${activeConversation.id}`);
                    if (res.success) setMessages(res.messages);
                } catch (err) {
                    console.error("Failed to fetch thread", err);
                }
            };
            fetchThread();
        }
    }, [activeConversation]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 0) {
            setIsSearching(true);
            try {
                const res = await apiFetch(`/api/v1/users/search?q=${query}`);
                if (res.success) setSearchResults(res.users);
            } catch (err) {
                console.error(err);
            }
        } else {
            setIsSearching(false);
            setSearchResults([]);
        }
    };

    const startChat = (targetUser) => {
        setSearchQuery('');
        setIsSearching(false);
        // Check if conversation already exists
        const existing = conversations.find(c => c.other_participants.some(p => p.id === targetUser.id));
        if (existing) {
            setActiveConversation(existing);
        } else {
            // Create a temporary conversation object for UI until a message is sent
            setActiveConversation({
                id: 'temp',
                other_participants: [targetUser],
                isTemp: true
            });
            setMessages([]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        const recipientId = activeConversation.other_participants[0].id;
        const content = newMessage.trim();
        setNewMessage('');

        try {
            const res = await apiFetch('/api/v1/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId, content })
            });

            if (res.success) {
                if (activeConversation.isTemp) {
                    // It was a temp chat, now it's real. Re-fetch conversations
                    const convRes = await apiFetch('/api/v1/messages/conversations');
                    if (convRes.success) {
                        setConversations(convRes.conversations);
                        const newConv = convRes.conversations.find(c => c.other_participants.some(p => p.id === recipientId));
                        if (newConv) setActiveConversation(newConv);
                    }
                } else {
                    setMessages([...messages, res.message]);
                    // Update last message in list
                    setConversations(prev => prev.map(c => 
                        c.id === activeConversation.id ? { ...c, last_message: content, updated_at: new Date() } : c
                    ).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)));
                }
            }
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white">
            {/* Left Panel: Conversation List */}
            <div className="w-1/3 min-w-[300px] border-r border-gray-200 dark:border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-xl font-bold mb-4">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search people..." 
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isSearching ? (
                        <div>
                            {searchResults.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No users found.</div>
                            ) : (
                                searchResults.map(u => (
                                    <div 
                                        key={u.id} 
                                        onClick={() => startChat(u)}
                                        className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-gray-100 dark:border-gray-800/50"
                                    >
                                        <img src={u.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${u.username}`} className="w-10 h-10 rounded-full bg-gray-200" alt="Avatar" />
                                        <div>
                                            <p className="font-bold text-sm">{u.display_name || u.username}</p>
                                            <p className="text-gray-500 text-xs">@{u.username}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const partner = conv.other_participants[0];
                            if (!partner) return null;
                            const isActive = activeConversation?.id === conv.id;
                            
                            return (
                                <div 
                                    key={conv.id} 
                                    onClick={() => setActiveConversation(conv)}
                                    className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-100 dark:border-gray-800/50 transition-colors ${isActive ? 'bg-blue-50 dark:bg-slate-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                                >
                                    <img src={partner.avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${partner.username}`} className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" alt="Avatar" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="font-bold text-sm truncate">{partner.display_name || partner.username}</p>
                                            <span className="text-xs text-gray-400">
                                                {new Date(conv.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <p className="truncate max-w-[180px]">{conv.last_message || 'Started a chat'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel: Active Chat */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeConversation ? (
                    <>
                        {/* Top Bar */}
                        <div className="h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-[#0d1117]/80 backdrop-blur-md">
                            {activeConversation.other_participants[0] && (
                                <>
                                    <img src={activeConversation.other_participants[0].avatar_url || `https://api.dicebear.com/7.x/micah/svg?seed=${activeConversation.other_participants[0].username}`} className="w-10 h-10 rounded-full bg-gray-200" alt="Avatar" />
                                    <div>
                                        <div className="font-bold flex items-center gap-1">
                                            {activeConversation.other_participants[0].display_name || activeConversation.other_participants[0].username}
                                            <ShieldCheck size={14} className="text-green-500" />
                                        </div>
                                        <p className="text-xs text-gray-500">@{activeConversation.other_participants[0].username}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Chat Thread */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => {
                                const isMine = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-4 py-2 rounded-2xl max-w-[70%] ${isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white rounded-bl-sm'}`}>
                                            <p className="text-[15px]">{msg.content}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-400 mt-1 mx-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d1117]">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Start a new message" 
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 border-gray-300 dark:bg-zinc-800 dark:text-white dark:border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors"
                                >
                                    <Send size={18} className="ml-0.5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <MessageCircle size={64} className="mb-4 text-gray-200 dark:text-gray-800" strokeWidth={1} />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a message</h2>
                        <p className="text-center max-w-sm">Choose from your existing conversations, start a new one, or just keep swimming.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
