import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/txHashes.json');

export const saveTxHash = async (postId, txHash) => {
    try {
        let data = {};
        try {
            const fileContent = await fs.readFile(DATA_FILE, 'utf8');
            data = JSON.parse(fileContent);
        } catch (err) {
            // File might not exist or be empty
        }
        
        data[postId] = txHash;
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[TxStore] Saved txHash for post ${postId}`);
    } catch (err) {
        console.error(`[TxStore] Failed to save txHash for post ${postId}:`, err.message);
    }
};

export const getTxHash = async (postId) => {
    try {
        const fileContent = await fs.readFile(DATA_FILE, 'utf8');
        const data = JSON.parse(fileContent);
        return data[postId] || null;
    } catch (err) {
        return null;
    }
};
