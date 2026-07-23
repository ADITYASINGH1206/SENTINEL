import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import postSocialRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import trendingRoutes from './routes/trendingRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import web3Routes from './routes/web3Routes.js';
import relayerRoutes from './routes/relayer.js';
import reportRoutes from './routes/reportRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/v1/posts', postSocialRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/trending', trendingRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/web3', web3Routes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api', relayerRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Sentinel Node.js Backend running on port ${PORT}`);
});
