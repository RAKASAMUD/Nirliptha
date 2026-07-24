// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {externalEuint256} from "encrypted-types/EncryptedTypes.sol";
import {AuctionTypes} from "./AuctionTypes.sol";
import {Auction} from "./Auction.sol";

/// @title AuctionFactory — deploys and tracks Auction instances for the Nox confidential auction protocol
/// @notice Permissionless: any wallet may create an auction and becomes that auction's issuer
///         (msg.sender is passed as Auction's immutable `issuer`). There is no single protocol-wide
///         issuer — issuer-only actions (finalize, completeSettlement, withdrawToSafe, grantAuditView,
///         rotateHandles) are gated per-instance inside Auction.sol itself via `onlyIssuer`.
contract AuctionFactory {
    IERC7984 public immutable cUSD;
    IERC7984 public immutable cAsset;

    address[] public auctions;

    event AuctionCreated(
        uint256 indexed id,
        address indexed auction,
        address indexed issuer,
        uint256 quantity,
        uint256 reservePrice,
        uint256 deadline,
        address safe
    );

    constructor(address _cUSD, address _cAsset) {
        require(_cUSD != address(0) && _cAsset != address(0), "Zero address");
        cUSD = IERC7984(_cUSD);
        cAsset = IERC7984(_cAsset);
    }

    /// @notice Create a new Auction instance. Caller becomes the issuer and must escrow cAsset
    ///         into the instance after deploy.
    function createAuction(
        uint256 quantity,
        uint256 reservePrice,
        uint256 deadline,
        address safeAddress
    ) external returns (address auction) {
        require(quantity > 0, "quantity=0");
        require(reservePrice > 0, "reservePrice=0");
        require(deadline > block.timestamp + 5 minutes, "deadline too soon");
        require(safeAddress != address(0), "safe=0");

        Auction instance = new Auction(
            msg.sender,
            address(cUSD),
            address(cAsset),
            quantity,
            reservePrice,
            deadline,
            safeAddress
        );

        auctions.push(address(instance));
        emit AuctionCreated(auctions.length - 1, address(instance), msg.sender, quantity, reservePrice, deadline, safeAddress);
        return address(instance);
    }

    function auctionCount() external view returns (uint256) {
        return auctions.length;
    }
}
