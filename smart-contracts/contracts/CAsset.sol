// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

/// @title CAsset — Confidential Asset token (ERC7984)
/// @notice Only owner (issuer) can mint. Balances stored as encrypted handles.
contract CAsset is ERC7984, Ownable {
    constructor() ERC7984("Confidential Asset", "cASSET", "") Ownable(msg.sender) {}

    /// @notice Mint encrypted amount to `to`. Amount must be pre-encrypted client-side via @iexec-nox/handle SDK.
    function mint(
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint256) {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        euint256 minted = _mint(to, amount);
        Nox.allow(minted, to);
        return minted;
    }

    /// @notice Public testnet faucet minting for demo/testing on Sepolia
    function faucetMint(
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint256) {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        euint256 minted = _mint(msg.sender, amount);
        Nox.allow(minted, msg.sender);
        return minted;
    }
}
