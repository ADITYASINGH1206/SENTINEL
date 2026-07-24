import { wallet, sentinelContract } from './config/ethers.js';
import { ethers } from 'ethers';
async function run() {
    const bal = await sentinelContract.balanceOf(wallet.address);
    console.log("Relayer SNTL Balance:", ethers.formatEther(bal));
}
run();
