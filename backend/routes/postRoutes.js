const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

// Mock data storage for hackathon testing
let likesDB = [];
let commentsDB = [];
let sharesDB = [];

// POST /api/v1/posts/:id/like
router.post('/:id/like', verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const existingLikeIndex = likesDB.findIndex(l => l.postId === postId && l.userId === userId);
        
        if (existingLikeIndex !== -1) {
            // Unlike
            likesDB.splice(existingLikeIndex, 1);
            return res.json({ success: true, action: 'unliked' });
        } else {
            // Like
            likesDB.push({ postId, userId, createdAt: new Date() });
            return res.json({ success: true, action: 'liked' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/v1/posts/:id/comments
router.post('/:id/comments', verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { content } = req.body;

        if (!content) return res.status(400).json({ error: 'Comment content is required' });

        const newComment = {
            id: Date.now().toString(),
            postId,
            userId,
            content,
            createdAt: new Date(),
            user: { handle: req.user.email || 'User' } // Mock user detail
        };

        commentsDB.push(newComment);
        res.status(201).json({ success: true, comment: newComment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/v1/posts/:id/comments
router.get('/:id/comments', async (req, res) => {
    try {
        const postId = req.params.id;
        const postComments = commentsDB.filter(c => c.postId === postId);
        res.json({ success: true, comments: postComments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/v1/posts/:id/share
router.post('/:id/share', verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const existingShareIndex = sharesDB.findIndex(s => s.postId === postId && s.userId === userId);
        
        if (existingShareIndex !== -1) {
            sharesDB.splice(existingShareIndex, 1);
            return res.json({ success: true, action: 'unshared' });
        } else {
            sharesDB.push({ postId, userId, createdAt: new Date() });
            return res.json({ success: true, action: 'shared' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
