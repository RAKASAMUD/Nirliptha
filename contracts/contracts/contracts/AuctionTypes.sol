// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {euint256} from "encrypted-types/EncryptedTypes.sol";

/// @title AuctionTypes — shared enums and structs for the Nox Protocol auction system
library AuctionTypes {
    enum Status {
        AwaitingEscrow,
        Open,
        PendingReveal, // finalize() computed allocations + marked clearing price for public decryption;
                       // awaiting completeSettlement() with the off-chain decrypted value + proof
        Settled
    }

    struct BidRecord {
        address bidder;
        uint256 bidIndex;             // submission order (0-based), used as FCFS tie-break
        euint256 handleQ;             // encrypted quantity bid
        euint256 handleP;             // encrypted price per token
        euint256 handleActualDeposit; // encrypted amount ACTUALLY locked (confidentialTransferFrom
                                       // never reverts on insufficient balance — it silently moves 0).
                                       // May be less than Q×P if the bidder was under-funded.
        bool claimed;
    }

    struct AllocationRecord {
        euint256 handleQuantity; // encrypted allocated cAsset amount
        bool claimed;
    }
}
