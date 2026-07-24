import express from 'express';
import { toggleBookmark, getBookmarks } from '../controllers/bookmarkController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/toggle/:postId', verifyToken, toggleBookmark);
router.get('/', verifyToken, getBookmarks);

export default router;
