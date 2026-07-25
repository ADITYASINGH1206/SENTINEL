import { supabase } from '../supabaseClient.js';

// Toggle Bookmark
export const toggleBookmark = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user.id;
        
        // Check if bookmark exists
        const { data: existingBookmark, error: fetchError } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingBookmark) {
            // Delete
            const { error: deleteError } = await supabase
                .from('bookmarks')
                .delete()
                .eq('id', existingBookmark.id);
            if (deleteError) throw deleteError;
            return res.status(200).json({ success: true, bookmarked: false });
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('bookmarks')
                .insert({ user_id: userId, post_id: postId });
            if (insertError) throw insertError;
            return res.status(200).json({ success: true, bookmarked: true });
        }
    } catch (err) {
        console.error('Error toggling bookmark:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Get Bookmarks
export const getBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('bookmarks')
            .select(`
                post_id,
                posts (
                    *,
                    users (username, display_name, avatar_url),
                    likes (user_id),
                    comments (id),
                    reposts (user_id)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map the result to match standard posts structure
        const posts = data.map(b => b.posts).filter(p => p !== null);

        res.json({ success: true, posts });
    } catch (err) {
        console.error('Error fetching bookmarks:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
