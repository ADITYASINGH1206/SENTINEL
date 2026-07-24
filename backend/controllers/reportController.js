import { createReport } from '../services/moderationService.js';
import { supabase } from '../supabaseClient.js';
import { addReportedContent } from '../routes/relayer.js';

export const submitReport = async (req, res) => {
    try {
        const reporterId = req.user.id;
        const { target_type, target_id, reason } = req.body;

        if (!['account', 'post'].includes(target_type)) {
            return res.status(400).json({ error: 'Invalid target_type. Must be account or post.' });
        }

        if (!['spam', 'nudity', '18+', 'misleading'].includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason.' });
        }

        // Fire and forget to the Moderation Service (Role 3)
        // We don't block the frontend response on the ML classification
        createReport(target_type, target_id, reason, reporterId).catch(err => {
            console.error('[Report Submission Error]', err.message);
        });
        
        // Link with Verification Hub (Hackathon Demo logic)
        if (target_type === 'post') {
            const { data: postData } = await supabase.from('posts').select('content, user_id').eq('id', target_id).single();
            if (postData) {
                const { data: userData } = await supabase.from('users').select('wallet_address').eq('id', postData.user_id).single();
                const commentText = req.body.comment || reason;
                addReportedContent(target_id, postData.content, userData?.wallet_address, commentText);
            }
        }

        res.status(201).json({ success: true, message: 'Report submitted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
