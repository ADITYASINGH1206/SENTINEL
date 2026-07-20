import express from 'express';
import { registerPostOnChain, renderVerdictOnChain, getUserState } from '../controllers/web3Controller.js';

const router = express.Router();

router.post('/register', registerPostOnChain);
router.post('/verdict', renderVerdictOnChain);
router.get('/state/:address', getUserState);

export default router;
