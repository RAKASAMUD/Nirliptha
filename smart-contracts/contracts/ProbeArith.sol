// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

// T0.5 Probe: encrypted multiplication (Q×P feasibility)
contract ProbeArith {
    euint256 public result;

    function multiply(
        externalEuint256 _a,
        bytes calldata _proofA,
        externalEuint256 _b,
        bytes calldata _proofB
    ) public {
        euint256 a = Nox.fromExternal(_a, _proofA);
        euint256 b = Nox.fromExternal(_b, _proofB);
        result = Nox.mul(a, b);
        Nox.allowThis(result);
        Nox.allow(result, msg.sender);
    }
}
