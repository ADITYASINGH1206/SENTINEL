import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import { createPost, getAllPosts, addComment, getComments, toggleLike, toggleRepost, incrementImpression } from '../controllers/postController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Core Post Routes
router.get('/', getAllPosts);
router.post('/', verifyToken, upload.single('media'), createPost);

// Social Interaction Routes
router.post('/:id/like', verifyToken, toggleLike);
router.post('/:id/repost', verifyToken, toggleRepost);
router.post('/:id/impression', incrementImpression);
router.post('/:id/comments', verifyToken, addComment);
router.get('/:id/comments', getComments);

export default router;
