import express from 'express';
import { getConversations, getThread, sendMessage } from '../controllers/messageController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', verifyToken, getConversations);
router.get('/thread/:conversationId', verifyToken, getThread);
router.post('/send', verifyToken, sendMessage);

export default router;
