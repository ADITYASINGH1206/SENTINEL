// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SentinelRegistry {
    event UserRewarded(address indexed user);
    event UserFlagged(address indexed user);

    function rewardUser(address user) external {
        // Basic stub for rewarding a user
        emit UserRewarded(user);
    }

    function flagUser(address user) external {
        // Basic stub for flagging a user
        emit UserFlagged(user);
    }
}
