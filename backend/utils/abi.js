export const SentinelRegistryABI = [
  "function claimInitialTokens() external",
  "function registerContent(bytes32 contentHash, string memory ipfsHash, address author) external",
  "function updateVerification(bytes32 contentHash, uint8 finalStatus) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function userTrustScores(address account) external view returns (uint256)",
  "function hasClaimedAirdrop(address account) external view returns (bool)"
];
