import { supabase } from '../supabaseClient.js';

export const getTrending = async (req, res) => {
    try {
        // Aggregate Hashtags
        const { data: hashtagCounts, error: tagErr } = await supabase
            .from('post_hashtags')
            .select('hashtag_id, hashtags(tag)');
        
        const counts = {};
        if (hashtagCounts) {
            hashtagCounts.forEach(h => {
                const tag = h.hashtags?.tag;
                if (tag) {
                    counts[tag] = (counts[tag] || 0) + 1;
                }
            });
        }
        
        const topTags = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(e => ({ tag: e[0], count: e[1] }));
        
        // Fetch High Engagement Posts
        const { data: posts, error: postErr } = await supabase
            .from('posts')
            .select(`*, users (username, display_name, avatar_url), likes (user_id), comments (id), reposts (user_id)`);
            
        if (postErr) throw postErr;
        
        const scoredPosts = posts.map(p => {
             const score = (p.likes?.length || 0) * 2 + (p.reposts?.length || 0) * 3 + (p.impressions_count || 0);
             return { ...p, engagementScore: score };
        }).sort((a,b) => b.engagementScore - a.engagementScore).slice(0, 3);
        
        res.json({ success: true, hashtags: topTags, posts: scoredPosts });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};
