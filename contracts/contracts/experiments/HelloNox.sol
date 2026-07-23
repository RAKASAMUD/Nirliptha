// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {euint256, externalEuint256} from "encrypted-types/EncryptedTypes.sol";

contract HelloNox {
    euint256 public encryptedValue;

    // Fungsi untuk menyimpan nilai yang dienkripsi dari luar (klien)
    function setValue(externalEuint256 _externalHandle, bytes calldata _handleProof) public {
        // Validasi input proof menggunakan Nox SDK
        encryptedValue = Nox.fromExternal(_externalHandle, _handleProof);
    }
}
