import { relayContentRegistration, relayUpdateVerification } from './backend/utils/web3Relayer.js';
import crypto from 'crypto';

async function test() {
    try {
        const textToHash = 'test_content_123';
        const contentHash = '0x' + crypto.createHash('sha256').update(textToHash).digest('hex');
        console.log(`Starting test relay for hash: ${contentHash}`);
        
        const registerRes = await relayContentRegistration(contentHash, 'text_post', '0x0000000000000000000000000000000000000000');
        console.log('Register Res:', registerRes);
        
        const updateRes = await relayUpdateVerification(contentHash, 'verified');
        console.log('Update Res:', updateRes);
    } catch (err) {
        console.error('Test failed:', err);
    }
}
test();
