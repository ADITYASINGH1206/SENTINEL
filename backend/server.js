import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

import { processWeb3Transaction } from './services/web3Relayer.js';
import postSocialRoutes from './routes/postRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/posts', postSocialRoutes);

// Set up multer for multipart/form-data
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Mock Supabase Database (in-memory for the hackathon local testing)
// In production, use @supabase/supabase-js
let supabaseMockDB = [
    { id: 1, handle: "Alice", content: "Just saw this amazing video, is it real?", status: "verified" },
    { id: 2, handle: "Bob", content: "Check out this crazy breaking news image!", status: "flagged" }
];

app.get('/api/v1/posts', (req, res) => {
    res.json(supabaseMockDB);
});

app.post('/api/v1/posts', upload.single('media'), async (req, res) => {
    try {
        const { walletAddress, content } = req.body;
        
        console.log(`[Server] Received post from ${walletAddress || 'Unknown User'}`);
        
        // 1. Instantly save incoming post metadata with status 'pending'
        const newPost = {
            id: Date.now(),
            handle: walletAddress ? `${walletAddress.slice(0,6)}...` : "CurrentUser",
            content: content,
            status: "pending"
        };
        supabaseMockDB.unshift(newPost);
        
        // Respond to the client immediately so they see the 'pending' state
        res.status(200).json({ success: true, post: newPost });

        // 2. Asynchronously forward the file to the Python AI server
        if (req.file) {
            console.log(`[Server] Forwarding file ${req.file.originalname} to AI Engine...`);
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });
            
            try {
                const aiResponse = await axios.post('http://127.0.0.1:5000/api/v1/analyze', formData, {
                    headers: {
                        ...formData.getHeaders()
                    }
                });
                
                const aiResult = aiResponse.data;
                console.log(`[Server] AI Response:`, aiResult);
                
                const finalStatus = aiResult.is_fake ? 'flagged' : 'verified';
                
                // Update Supabase Mock DB
                const postIndex = supabaseMockDB.findIndex(p => p.id === newPost.id);
                if (postIndex !== -1) {
                    supabaseMockDB[postIndex].status = finalStatus;
                }

                // 3. Execute smart contract relayer
                await processWeb3Transaction(walletAddress || "0x000", finalStatus);
                
            } catch (aiError) {
                console.error("[Server] AI Engine Error:", aiError.message);
                const postIndex = supabaseMockDB.findIndex(p => p.id === newPost.id);
                if (postIndex !== -1) {
                    supabaseMockDB[postIndex].status = 'flagged'; // default fallback or error state
                }
            }
        } else {
             // No file attached, instantly verify
             const postIndex = supabaseMockDB.findIndex(p => p.id === newPost.id);
             if (postIndex !== -1) {
                 supabaseMockDB[postIndex].status = 'verified';
             }
        }
        
    } catch (error) {
        console.error(`[Server] Error processing post:`, error);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Sentinel Node.js Backend running on port ${PORT}`);
});
