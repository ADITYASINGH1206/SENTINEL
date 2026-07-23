import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import { updateProfile, toggleFollow, getSocialCounts, getUserProfile, getFollowers, getFollowing } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.put('/profile', verifyToken, upload.single('avatar_file'), updateProfile);
router.post('/:id/follow', verifyToken, toggleFollow);
router.get('/:id/social-counts', getSocialCounts);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id', getUserProfile);

export default router;
