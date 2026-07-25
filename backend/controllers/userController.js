import { supabase } from '../supabaseClient.js';
import { moderateAccountScore } from '../services/moderationService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = {};
        const allowedFields = ['display_name', 'bio', 'location', 'website', 'wallet_address', 'cover_url', 'avatar_url'];
        
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                // Coerce empty strings to null for wallet_address to avoid unique constraint violations
                if (field === 'wallet_address' && req.body[field].trim() === '') {
                    updates[field] = null;
                } else {
                    updates[field] = req.body[field];
                }
            }
        });
        
        if (req.file) {
             const filename = `avatar-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
             const { data, error } = await supabase.storage.from('media').upload(`public/${filename}`, req.file.buffer, {
                 contentType: req.file.mimetype,
                 upsert: false
             });
             if (error) {
                 console.error("Supabase storage upload error:", error);
                 throw new Error("Failed to upload avatar to Supabase storage");
             }
             const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(`public/${filename}`);
             updates.avatar_url = publicUrlData.publicUrl;
        }
        
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleFollow = async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;
        
        if (followerId === followingId) {
            return res.status(400).json({ error: "You cannot follow yourself." });
        }
        
        const { data: existingFollow } = await supabase
             .from('follows')
             .select('id')
             .eq('follower_id', followerId)
             .eq('following_id', followingId)
             .maybeSingle();
             
        if (existingFollow) {
            await supabase.from('follows').delete().eq('id', existingFollow.id);
            const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId);
            res.json({ success: true, action: 'unfollowed', followerCount, isFollowing: false });
        } else {
            await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
            
            // Trigger Notification
            await supabase.from('notifications').insert({
                notifier_id: followerId,
                receiver_id: followingId,
                type: 'follow'
            });
            
            const { count: followerCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', followingId);

            // Role 3: Recompute account spam score on new follow (fire-and-forget)
            moderateAccountScore(followingId).catch(err =>
                console.warn('[Moderation] Account score recompute failed:', err.message)
            );

            res.json({ success: true, action: 'followed', followerCount, isFollowing: true });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSocialCounts = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const { count: followersCount, error: err1 } = await supabase
             .from('follows')
             .select('*', { count: 'exact', head: true })
             .eq('following_id', userId);
             
        const { count: followingCount, error: err2 } = await supabase
             .from('follows')
             .select('*', { count: 'exact', head: true })
             .eq('follower_id', userId);
             
        if (err1 || err2) throw (err1 || err2);
        
        res.json({ success: true, followers: followersCount || 0, following: followingCount || 0 });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const getFollowers = async (req, res) => {
    try {
        const userId = req.params.id;
        // Get all follower IDs
        const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', userId);
            
        if (followsError) throw followsError;
        if (!followsData || followsData.length === 0) return res.json({ success: true, users: [] });

        const followerIds = followsData.map(f => f.follower_id);
        
        // Get user details
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio')
            .in('id', followerIds);
            
        if (usersError) throw usersError;
        res.json({ success: true, users: usersData });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const getFollowing = async (req, res) => {
    try {
        const userId = req.params.id;
        // Get all following IDs
        const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);
            
        if (followsError) throw followsError;
        if (!followsData || followsData.length === 0) return res.json({ success: true, users: [] });

        const followingIds = followsData.map(f => f.following_id);
        
        // Get user details
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio')
            .in('id', followingIds);
            
        if (usersError) throw usersError;
        res.json({ success: true, users: usersData });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim().length < 1) {
            return res.json({ success: true, users: [] });
        }
        
        // Search by username or display_name using case-insensitive like
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(20);
            
        if (error) throw error;
        res.json({ success: true, users: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
