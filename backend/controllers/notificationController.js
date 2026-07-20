import { supabase } from '../supabaseClient.js';

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('notifications')
            .select(`*, notifier:users!notifications_notifier_id_fkey(username, display_name, avatar_url)`)
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, notifications: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('receiver_id', userId)
            .eq('is_read', false);
            
        if (error) throw error;
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};
