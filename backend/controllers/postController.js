import { supabase } from '../supabaseClient.js';
import axios from 'axios';
import FormData from 'form-data';
import { relayContentRegistration, relayUpdateVerification } from '../utils/web3Relayer.js';
import { saveTxHash, getTxHash } from '../utils/txStore.js';
import crypto from 'crypto';

export const createPost = async (req, res) => {
    try {
        const { content, walletAddress } = req.body;
        const userId = req.user.id;
        
        let mediaUrl = null;
        if (req.file) {
             const fileExt = req.file.originalname.split('.').pop();
             const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
             
             const { data: uploadData, error: uploadError } = await supabase.storage
                 .from('media')
                 .upload(fileName, req.file.buffer, {
                     contentType: req.file.mimetype,
                     upsert: false
                 });
                 
             if (uploadError) {
                 console.error("Supabase Upload Error:", uploadError);
                 throw new Error("Failed to upload media");
             }
             
             const { data: publicUrlData } = supabase.storage
                 .from('media')
                 .getPublicUrl(fileName);
                 
             mediaUrl = publicUrlData.publicUrl;
        }

        const { data: newPost, error } = await supabase
            .from('posts')
            .insert({ user_id: userId, content, media_url: mediaUrl, ai_status: 'pending' })
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
        
        // Asynchronous AI Moderation Check (Non-blocking)
        if (req.file) {
             const formData = new FormData();
             formData.append('file', req.file.buffer, {
                 filename: req.file.originalname,
                 contentType: req.file.mimetype
             });
             
             try {
                  const aiResponse = await axios.post('http://127.0.0.1:5000/api/v1/analyze', formData, {
                      headers: { ...formData.getHeaders() }
                  });
                  const isFake = aiResponse.data.is_fake;
                  const finalStatus = isFake ? 'flagged' : 'verified';
                  
                  await supabase.from('posts').update({ ai_status: finalStatus }).eq('id', newPost.id);
                  
                  // Trigger web3 Relayer if wallet address exists, else fallback to a default address
                  const { data: userRecord } = await supabase.from('users').select('wallet_address').eq('id', userId).single();
                  const targetAddress = userRecord?.wallet_address || walletAddress || '0x0000000000000000000000000000000000000000';
                  executeWeb3Relay(newPost, content, mediaUrl, targetAddress, finalStatus).catch(err => console.error("Web3 Relay failed:", err));
                  
             } catch (aiErr) {
                  console.error('[AI Orchestrator Error]', aiErr.message);
                  await supabase.from('posts').update({ ai_status: 'flagged' }).eq('id', newPost.id);
                  // Trigger web3 Relayer even if AI fails
                  const { data: userRecord } = await supabase.from('users').select('wallet_address').eq('id', userId).single();
                  const targetAddress = userRecord?.wallet_address || walletAddress || '0x0000000000000000000000000000000000000000';
                  executeWeb3Relay(newPost, content, mediaUrl, targetAddress, 'flagged').catch(err => console.error("Web3 Relay failed:", err));
             }
        } else {
             // No media file, analyze text
             try {
                  const textAnalysisResponse = await axios.post('http://127.0.0.1:5000/api/v1/analyze/text', {
                      text: content
                  }, {
                      headers: {
                          'Content-Type': 'application/json'
                      }
                  });
                  
                  const { ai_detection, safety } = textAnalysisResponse.data;
                  
                  let finalStatus = 'verified';
                  // Flag if AI generated or if risk score implies low trust
                  const trustThreshold = parseInt(process.env.TRUST_SCORE_THRESHOLD || '80', 10);
                  const trustScore = 100 - (safety?.risk_score || 0);
                  
                  if (ai_detection?.is_ai_generated || trustScore < trustThreshold) {
                      finalStatus = 'flagged';
                  }

                  await supabase.from('posts').update({ ai_status: finalStatus }).eq('id', newPost.id);
                  
                  // Trigger web3 Relayer if wallet address exists, else fallback to a default address
                  const { data: userRecord } = await supabase.from('users').select('wallet_address').eq('id', userId).single();
                  const targetAddress = userRecord?.wallet_address || walletAddress || '0x0000000000000000000000000000000000000000';
                  executeWeb3Relay(newPost, content, mediaUrl, targetAddress, finalStatus).catch(err => console.error("Web3 Relay failed:", err));

             } catch (aiErr) {
                  console.error('[AI Orchestrator Error - Text]', aiErr?.response?.data || aiErr.message);
                  await supabase.from('posts').update({ ai_status: 'flagged' }).eq('id', newPost.id);
                  // Trigger web3 Relayer even if AI fails
                  const { data: userRecord } = await supabase.from('users').select('wallet_address').eq('id', userId).single();
                  const targetAddress = userRecord?.wallet_address || walletAddress || '0x0000000000000000000000000000000000000000';
                  executeWeb3Relay(newPost, content, mediaUrl, targetAddress, 'flagged').catch(err => console.error("Web3 Relay failed:", err));
             }
        }

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
