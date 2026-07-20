import express from 'express';
import { getTrending } from '../controllers/trendingController.js';

const router = express.Router();

router.get('/', getTrending);

export default router;
