// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SentinelRegistry is ERC20, Ownable {
    
    enum VerificationStatus { PENDING, VERIFIED, FLAGGED }

    struct Record {
        string ipfsHash;
        VerificationStatus status;
        uint256 timestamp;
        address author;
    }

    // Airdrop state
    mapping(address => bool) public hasClaimedAirdrop;

    // Reputation system
    mapping(address => uint256) public userTrustScores;

    // Registry of content
    mapping(bytes32 => Record) public mediaRecords;

    event TokensClaimed(address indexed user, uint256 amount);
    event ContentRegistered(bytes32 indexed contentHash, string ipfsHash, address indexed author);
    event VerdictRendered(bytes32 indexed contentHash, VerificationStatus status, address indexed author);

    constructor() ERC20("Sentinel Token", "SNTL") Ownable(msg.sender) {}

    /**
     * @dev Allows a new wallet to mint 500 $SNTL tokens for participating in the ecosystem.
     */
    function claimInitialTokens() external {
        require(!hasClaimedAirdrop[msg.sender], "Airdrop already claimed");
        hasClaimedAirdrop[msg.sender] = true;
        
        // Initialize trust score for a new active user
        if (userTrustScores[msg.sender] == 0) {
            userTrustScores[msg.sender] = 100;
        }

        // Mint 500 tokens (adjusting for 18 decimals)
        _mint(msg.sender, 500 * 10**decimals());
        emit TokensClaimed(msg.sender, 500);
    }

    /**
     * @dev Relayer registers a post pending verification.
     */
    function registerContent(bytes32 contentHash, string memory ipfsHash, address author) external onlyOwner {
        require(mediaRecords[contentHash].timestamp == 0, "Content already registered");

        mediaRecords[contentHash] = Record({
            ipfsHash: ipfsHash,
            status: VerificationStatus.PENDING,
            timestamp: block.timestamp,
            author: author
        });

        // Ensure trust score is initialized for unregistered authors
        if (userTrustScores[author] == 0) {
            userTrustScores[author] = 100;
        }

        emit ContentRegistered(contentHash, ipfsHash, author);
    }

    /**
     * @dev AI Orchestrator relayer renders a final verdict on the content.
     */
    function updateVerification(bytes32 contentHash, VerificationStatus finalStatus) external onlyOwner {
        require(mediaRecords[contentHash].timestamp != 0, "Content not registered");
        require(mediaRecords[contentHash].status == VerificationStatus.PENDING, "Verdict already rendered");

        mediaRecords[contentHash].status = finalStatus;
        address author = mediaRecords[contentHash].author;

        if (finalStatus == VerificationStatus.VERIFIED) {
            // Reward: Mint 50 SNTL and boost trust
            _mint(author, 50 * 10**decimals());
            userTrustScores[author] += 10;
        } else if (finalStatus == VerificationStatus.FLAGGED) {
            // Penalty: Burn 50 SNTL and slash trust
            uint256 penalty = 50 * 10**decimals();
            if (balanceOf(author) >= penalty) {
                _burn(author, penalty);
            } else {
                _burn(author, balanceOf(author)); // Burn whatever they have left
            }
            
            // Slash trust, ensuring it doesn't underflow
            if (userTrustScores[author] >= 30) {
                userTrustScores[author] -= 30;
            } else {
                userTrustScores[author] = 0;
            }
        }

        emit VerdictRendered(contentHash, finalStatus, author);
    }
}
