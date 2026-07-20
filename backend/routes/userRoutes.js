import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { updateProfile, toggleFollow, getSocialCounts, getUserProfile } from '../controllers/userController.js';

const router = express.Router();

router.put('/profile', verifyToken, updateProfile);
router.post('/:id/follow', verifyToken, toggleFollow);
router.get('/:id/social-counts', getSocialCounts);
router.get('/:id', getUserProfile);

export default router;
