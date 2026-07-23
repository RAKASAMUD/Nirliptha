// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, ebool, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

// T0.6 Probe: encrypted comparison (balance >= deposit feasibility)
contract ProbeCompare {
    event CompareResult(bool conditionMet);

    // Returns encrypted bool: is a >= b?
    // Reverts with plaintext message if NOT (using select trick — can't revert on ebool directly)
    euint256 public lastA;
    euint256 public lastB;
    ebool public lastGe;

    function compare(
        externalEuint256 _a,
        bytes calldata _proofA,
        externalEuint256 _b,
        bytes calldata _proofB
    ) public {
        euint256 a = Nox.fromExternal(_a, _proofA);
        euint256 b = Nox.fromExternal(_b, _proofB);
        ebool ge = Nox.ge(a, b);

        lastA = a;
        lastB = b;
        lastGe = ge;

        Nox.allowThis(a);
        Nox.allowThis(b);
        Nox.allowThis(ge);
        Nox.allow(a, msg.sender);
        Nox.allow(b, msg.sender);
        Nox.allow(ge, msg.sender);
    }
}
