import { wallet } from './config/ethers.js';
import { ethers } from 'ethers';
async function run() {
    const bal = await wallet.provider.getBalance(wallet.address);
    console.log("Relayer ETH Balance:", ethers.formatEther(bal));
}
run();
