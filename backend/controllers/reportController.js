import { createReport } from '../services/moderationService.js';

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

        res.status(201).json({ success: true, message: 'Report submitted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
