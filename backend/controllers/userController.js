import { supabase } from '../supabaseClient.js';

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bio, wallet_address, avatar_url, cover_url } = req.body;
        
        const { data, error } = await supabase
            .from('users')
            .update({ bio, wallet_address, avatar_url, cover_url })
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
