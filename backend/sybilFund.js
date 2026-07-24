import { wallet, sentinelContract } from './config/ethers.js';
import { ethers } from 'ethers';

async function farmTokens() {
    console.log(`Starting token farming for Relayer: ${wallet.address}`);
    const provider = wallet.provider;
    
    // Farm 10 times = 5000 SNTL
    for (let i = 0; i < 10; i++) {
        try {
            console.log(`\n--- Farming Round ${i+1} ---`);
            // 1. Create random burner wallet
            const burner = ethers.Wallet.createRandom().connect(provider);
            console.log(`Created Burner: ${burner.address}`);
            
            // 2. Fund burner with 0.002 ETH for gas
            console.log(`Sending 0.002 ETH for gas...`);
            const txFund = await wallet.sendTransaction({
                to: burner.address,
                value: ethers.parseEther("0.002")
            });
            await txFund.wait();
            
            // 3. Connect burner to contract and claim airdrop
            console.log(`Claiming 500 SNTL Airdrop...`);
            const burnerContract = sentinelContract.connect(burner);
            const txClaim = await burnerContract.claimInitialTokens();
            await txClaim.wait();
            
            // 4. Transfer 500 SNTL back to Relayer
            console.log(`Transferring 500 SNTL to Relayer...`);
            const txTransfer = await burnerContract.transfer(wallet.address, ethers.parseEther("500"));
            await txTransfer.wait();
            
            console.log(`✅ Round ${i+1} Complete!`);
        } catch (e) {
            console.error(`❌ Round ${i+1} Failed:`, e.message);
        }
    }
    
    const finalBal = await sentinelContract.balanceOf(wallet.address);
    console.log(`\n🎉 Final Relayer SNTL Balance: ${ethers.formatEther(finalBal)}`);
}

farmTokens();
