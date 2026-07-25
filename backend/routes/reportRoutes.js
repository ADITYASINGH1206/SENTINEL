import express from 'express';
import { submitReport } from '../controllers/reportController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, submitReport);

export default router;
