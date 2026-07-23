// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, ebool, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

// T0.7 Probe: sort N encrypted bids using selection sort via Nox.select()
// No native sort — we implement min-finding manually with encrypted comparisons.
// Goal: find the minimum encrypted value among N inputs (simulates clearing price logic).
contract ProbeSort {
    uint256 public constant MAX_N = 10;

    euint256[MAX_N] public bids;
    uint256 public bidCount;
    euint256 public minBid; // simulates clearing price

    function submitBid(externalEuint256 _bid, bytes calldata _proof) public {
        require(bidCount < MAX_N, "full");
        euint256 b = Nox.fromExternal(_bid, _proof);
        Nox.allowThis(b);
        bids[bidCount] = b;
        bidCount++;
    }

    // Find min of all submitted bids (simulates finding clearing price).
    // Gas cost here is the key observation for T0.7.
    function findMin() public {
        require(bidCount > 0, "no bids");
        euint256 m = bids[0];
        for (uint256 i = 1; i < bidCount; i++) {
            // select(a < b, a, b) = min(a, b)
            ebool lt = Nox.lt(bids[i], m);
            m = Nox.select(lt, bids[i], m);
        }
        minBid = m;
        Nox.allowThis(minBid);
        Nox.allow(minBid, msg.sender);
    }

    function reset() public {
        bidCount = 0;
    }
}
