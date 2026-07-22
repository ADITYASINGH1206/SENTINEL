/**
 * Moderation Service Client — calls Role 3 endpoints.
 * 
 * Endpoints:
 *   POST http://localhost:8002/moderate/image
 *   POST http://localhost:8002/moderate/account-score
 *   POST http://localhost:8002/report
 * 
 * All calls are fire-and-forget friendly — errors are caught
 * and logged, never thrown to callers.
 */

import axios from 'axios';

const MODERATION_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:8002';

/**
 * Send an image to Role 3 for moderation.
 * The moderation service writes results directly to the DB.
 * 
 * @param {string} postId - Post UUID
 * @param {string} imageUrl - Public URL of the image to moderate
 * @returns {object|null} - Moderation result or null on error
 */
export async function moderateImage(postId, imageUrl) {
    try {
        console.log(`[Moderation] Sending image moderation request for post ${postId}`);
        const response = await axios.post(`${MODERATION_URL}/moderate/image`, {
            post_id: postId,
            image_url: imageUrl,
        }, { timeout: 60000 }); // 60s timeout for ML inference

        console.log(`[Moderation] Image result: status=${response.data.status}, ` +
            `labels=${JSON.stringify(response.data.labels)}, ` +
            `deepfake=${response.data.deepfake_confidence}`);
        return response.data;
    } catch (err) {
        console.warn(`[Moderation] Image moderation failed: ${err.message}`);
        return null;
    }
}

/**
 * Request an account spam score recompute from Role 3.
 * 
 * @param {string} accountId - User UUID
 * @returns {object|null} - Score result or null on error
 */
export async function moderateAccountScore(accountId) {
    try {
        console.log(`[Moderation] Requesting account score for ${accountId}`);
        const response = await axios.post(`${MODERATION_URL}/moderate/account-score`, {
            account_id: accountId,
        }, { timeout: 10000 });

        console.log(`[Moderation] Account score: score=${response.data.score}, band=${response.data.band}`);
        return response.data;
    } catch (err) {
        console.warn(`[Moderation] Account score failed: ${err.message}`);
        return null;
    }
}

/**
 * Submit a report to Role 3.
 * 
 * @param {string} targetType - "account" | "post"
 * @param {string} targetId - UUID of the target
 * @param {string} reason - "spam" | "nudity" | "18+" | "misleading"
 * @param {string} reporterId - UUID of the reporting user
 * @returns {object|null} - Report result or null on error
 */
export async function createReport(targetType, targetId, reason, reporterId) {
    try {
        console.log(`[Moderation] Creating report: ${reason} on ${targetType}/${targetId}`);
        const response = await axios.post(`${MODERATION_URL}/report`, {
            target_type: targetType,
            target_id: targetId,
            reason: reason,
            reporter_id: reporterId,
        }, { timeout: 10000 });

        console.log(`[Moderation] Report created: id=${response.data.report_id}, routed_to=${response.data.routed_to}`);
        return response.data;
    } catch (err) {
        console.warn(`[Moderation] Report creation failed: ${err.message}`);
        return null;
    }
}
