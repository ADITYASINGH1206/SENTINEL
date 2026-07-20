# Web3 & Smart Contract Agent Rules

## Tech Stack
- Solidity ^0.8.20
- Development Environment: Hardhat
- Frameworks: OpenZeppelin (for secure tokens/access control)

## Smart Contract Guidelines
- The core contract is `SentinelRegistry.sol`. 
- Optimize for gas efficiency, as this will be deployed to a live testnet.
- Security First: Always use `msg.sender` for authentication. Protect sensitive functions (like automated flagging or token minting) with `modifier onlyOwner` or role-based access control.

## Deployment & Testing
- Write deployment scripts in standard Hardhat format (inside the `ignition/` or `scripts/` folder).
- When asked to write tests, use standard Chai/Mocha syntax compatible with Hardhat.