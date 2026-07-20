import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import postSocialRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/posts', postSocialRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Sentinel Node.js Backend running on port ${PORT}`);
});
