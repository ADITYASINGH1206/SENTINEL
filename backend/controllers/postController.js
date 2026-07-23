import { supabase } from '../supabaseClient.js';
import axios from 'axios';
import FormData from 'form-data';
import { moderateImage } from '../services/moderationService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { relayContentRegistration, relayUpdateVerification } from '../utils/web3Relayer.js';
import { saveTxHash, getTxHash } from '../utils/txStore.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createPost = async (req, res) => {
    try {
        const { content, walletAddress } = req.body;
        const userId = req.user.id;
        
        let mediaUrls = [];
        if (req.files && req.files.length > 0) {
             const uploadsDir = path.join(__dirname, '..', 'uploads');
             if (!fs.existsSync(uploadsDir)) {
                 fs.mkdirSync(uploadsDir, { recursive: true });
             }
             for (const file of req.files) {
                 const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
                 const filepath = path.join(uploadsDir, filename);
                 fs.writeFileSync(filepath, file.buffer);
                 mediaUrls.push(`http://localhost:8000/uploads/${filename}`);
             }
        }
        const mediaUrl = mediaUrls[0] || null; // For legacy backwards compat

        const { data: newPost, error } = await supabase
            .from('posts')
            .insert({ user_id: userId, content, media_url: mediaUrl, media_urls: mediaUrls, ai_status: 'pending' })
            .select()
            .single();
            
        if (error) throw error;
        
        // Extract and insert hashtags
        const hashtags = content.match(/#[a-z0-9_]+/gi);
        if (hashtags) {
            const uniqueTags = [...new Set(hashtags.map(t => t.toLowerCase()))];
            for (const tag of uniqueTags) {
                const { data: tagData } = await supabase.from('hashtags').upsert({ tag }, { onConflict: 'tag' }).select('id').single();
                if (tagData) {
                    await supabase.from('post_hashtags').insert({ post_id: newPost.id, hashtag_id: tagData.id });
                }
            }
        }
        
        // Respond instantly with pending status
        res.status(201).json({ success: true, post: newPost });
        
        // Asynchronous AI Moderation Check (Parallel Dispatch)
        const hasText = content && content.trim().length > 0;
        const hasMedia = mediaUrls.length > 0;

        const promises = [];
        
        if (hasText) {
             promises.push(
                  axios.post('http://127.0.0.1:5000/api/v1/analyze/text', { text: content }, {
                       headers: { 'Content-Type': 'application/json' },
                       timeout: 30000
                  })
                  .then(res => ({ type: 'text', data: res.data }))
                  .catch(err => {
                       console.error('[AI Orchestrator Error - Text]', err?.response?.data || err.message);
                       return { type: 'text', error: err };
                  })
             );
        }
        
        if (hasMedia) {
             for (let i = 0; i < mediaUrls.length; i++) {
                  const url = mediaUrls[i];
                  promises.push(
                       moderateImage(newPost.id, url)
                       .then(data => ({ type: 'image', data, url, index: i }))
                       .catch(err => {
                            console.error('[Moderation Error]', err.message);
                            return { type: 'image', error: err, url, index: i };
                       })
                  );
             }
        }

        const results = await Promise.allSettled(promises);
        
        let isLabeled = false;
        let isBlocked = false;
        let updatePayload = {};

        results.forEach(result => {
             if (result.status === 'fulfilled' && !result.value.error) {
                  const { type, data } = result.value;
                  if (type === 'text' && data) {
                       const riskScore = data?.safety?.risk_score ?? 0;
                       const aiConfidence = data?.ai_detection?.confidence_score ?? 0;
                       const domainTopic = data?.domain?.primary_topic ?? 'General';
                       const subTopics = data?.domain?.sub_topics ?? [];
                       const flaggedCategories = data?.safety?.flagged_categories ?? [];
                       const isAiGenerated = data?.ai_detection?.is_ai_generated ?? false;
                       
                       const analysisSummary = [data?.safety?.summary, data?.ai_detection?.reasoning].filter(Boolean).join(" ");

                       if (isAiGenerated || riskScore >= 50 || flaggedCategories.length > 0) {
                            isLabeled = true;
                       }
                       
                       Object.assign(updatePayload, {
                            domain_topic: domainTopic,
                            sub_topics: subTopics,
                            analysis_summary: analysisSummary.trim(),
                            ai_confidence: aiConfidence,
                            risk_score: riskScore,
                            flagged_categories: flaggedCategories
                       });
                  } else if (type === 'image' && data) {
                       if (data.status === 'blocked') {
                            isBlocked = true;
                       } else if (data.deepfake_confidence > 0.6 || data.disclosed_ai_content || (data.labels && data.labels.includes('ai_generated_image')) || data.status === 'flagged') {
                            isLabeled = true;
                       }

                       const currentLabels = updatePayload.image_labels || [];
                       const incomingLabels = data.labels || [];
                       const newLabels = [...currentLabels, ...incomingLabels];

                       const sensitiveTokens = ['18+', 'sensitive_content', 'too_revealing', 'explicit_content'];
                       if (incomingLabels.some(l => sensitiveTokens.includes(l))) {
                            newLabels.push(`sensitive_index_${result.value.index}`);
                       }

                       const uniqueLabels = [...new Set(newLabels)];
                       const currentConf = updatePayload.deepfake_confidence || 0;

                       Object.assign(updatePayload, {
                            image_moderation_status: isBlocked ? 'blocked' : (isLabeled ? 'flagged' : 'verified'),
                            image_labels: uniqueLabels,
                            deepfake_confidence: Math.max(currentConf, data.deepfake_confidence || 0),
                            deepfake_model_version: data.deepfake_model_version
                       });
                  }
             } else {
                  // Fallback for timeout or failure
                  isLabeled = true;
             }
        });

        // Compute final status and visibility
        let finalStatus = 'verified';
        let visibility = 'public';

        if (isLabeled) {
             finalStatus = 'flagged';
             visibility = 'labeled';
        } else if (isBlocked) {
             visibility = 'labeled'; 
        }

        updatePayload.ai_status = finalStatus;
        updatePayload.visibility = visibility;

        await supabase.from('posts').update(updatePayload).eq('id', newPost.id);

        // Trigger web3 Relayer
        const { data: userRecord } = await supabase.from('users').select('wallet_address').eq('id', userId).single();
        const targetAddress = userRecord?.wallet_address || walletAddress || '0x0000000000000000000000000000000000000000';
        executeWeb3Relay(newPost, content, mediaUrls.join(','), targetAddress, finalStatus).catch(err => console.error("Web3 Relay failed:", err));

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
};

const executeWeb3Relay = async (newPost, content, mediaUrl, walletAddress, finalStatus) => {
    try {
        const textToHash = mediaUrl || content || newPost.id.toString();
        const contentHash = '0x' + crypto.createHash('sha256').update(textToHash).digest('hex');
        
        console.log(`[Web3] Starting on-chain relay for post ${newPost.id}, hash: ${contentHash}`);
        
        // 1. Register Content
        const registerRes = await relayContentRegistration(contentHash, mediaUrl || 'text_post', walletAddress);
        if (registerRes.success && registerRes.txHash) {
            console.log(`[Web3] Registration successful. Tx: ${registerRes.txHash}`);
            await saveTxHash(newPost.id, registerRes.txHash);
        }
        
        // 2. Update Verification Status
        await relayUpdateVerification(contentHash, finalStatus);
        console.log(`[Web3] Status updated to ${finalStatus} on-chain.`);
    } catch (err) {
        console.error(`[Web3] Relay execution failed for post ${newPost.id}:`, err);
    }
};

export const getPostTx = async (req, res) => {
    try {
        const txHash = await getTxHash(req.params.id);
        if (txHash) {
            return res.json({ success: true, txHash });
        }
        res.status(404).json({ success: false, message: "Transaction hash not found or pending" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`*, users (username, display_name, avatar_url), likes (user_id), comments (id), reposts (user_id)`)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.json({ success: true, posts: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.id;
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, user_id: userId, content })
            .select(`*, users (username, display_name, avatar_url)`)
            .single();
            
        if (error) throw error;
        
        // Notification
        const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
        if (post && post.user_id !== userId) {
            await supabase.from('notifications').insert({
                notifier_id: userId, receiver_id: post.user_id, type: 'comment', post_id: postId
            });
        }
        
        res.status(201).json({ success: true, comment: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const getComments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select(`*, users (username, display_name, avatar_url)`)
            .eq('post_id', req.params.id)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        res.json({ success: true, comments: data });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleLike = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        
        const { data: existingLike } = await supabase
             .from('likes')
             .select('id')
             .eq('post_id', postId)
             .eq('user_id', userId)
             .maybeSingle();
             
        if (existingLike) {
            await supabase.from('likes').delete().eq('id', existingLike.id);
            res.json({ success: true, action: 'unliked' });
        } else {
            await supabase.from('likes').insert({ post_id: postId, user_id: userId });
            
            // Notification
            const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
            if (post && post.user_id !== userId) {
                await supabase.from('notifications').insert({
                    notifier_id: userId, receiver_id: post.user_id, type: 'like', post_id: postId
                });
            }
            
            res.json({ success: true, action: 'liked' });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleRepost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        
        const { data: existingRepost } = await supabase
             .from('reposts')
             .select('id')
             .eq('post_id', postId)
             .eq('user_id', userId)
             .maybeSingle();
             
        if (existingRepost) {
            await supabase.from('reposts').delete().eq('id', existingRepost.id);
            res.json({ success: true, action: 'unreposted' });
        } else {
            await supabase.from('reposts').insert({ post_id: postId, user_id: userId });
            
            const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
            if (post && post.user_id !== userId) {
                await supabase.from('notifications').insert({
                    notifier_id: userId, receiver_id: post.user_id, type: 'repost', post_id: postId
                });
            }
            
            const { count: repostCount } = await supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('post_id', postId);
            res.json({ success: true, action: 'reposted', repostCount, isReposted: true });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

export const incrementImpression = async (req, res) => {
    try {
        const { error } = await supabase.rpc('increment_impression', { post_id_param: req.params.id });
        if (error) throw error;
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};
