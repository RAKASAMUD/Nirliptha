// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

// T0.9 Probe: can we extend ERC7984 with a mint function?
contract ProbeToken is ERC7984 {
    constructor() ERC7984("ProbeToken", "PT", "") {}

    // Minimal mint: create handle from plaintext amount (owner only for probe)
    function mint(address to, uint256 plainAmount) external {
        euint256 eAmount = Nox.toEuint256(plainAmount);
        _mint(to, eAmount);
    }

    // Wrap: accept external encrypted handle as mint
    function wrapEncrypted(externalEuint256 _amount, bytes calldata _proof) external {
        euint256 eAmount = Nox.fromExternal(_amount, _proof);
        _mint(msg.sender, eAmount);
    }
}
