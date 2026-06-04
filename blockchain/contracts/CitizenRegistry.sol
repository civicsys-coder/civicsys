// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title CitizenRegistry
/// @notice Registro on-chain de ciudadanos por hash de DNI.
/// @dev El hash se calcula off-chain (frontend o backend) como
///      keccak256(abi.encodePacked(dni, PUBLIC_SALT)). El contrato NO ve el DNI raw.
contract CitizenRegistry is ICitizenRegistry {
    /// @dev address => hash (bytes32(0) si no registrado).
    mapping(address => bytes32) private _hashes;

    /// @inheritdoc ICitizenRegistry
    function register(bytes32 dniHash) external {
        require(dniHash != bytes32(0), "CitizenRegistry: hash cero");
        require(_hashes[msg.sender] == bytes32(0), "CitizenRegistry: ya registrado");
        _hashes[msg.sender] = dniHash;
        emit CitizenRegistered(msg.sender, dniHash, block.timestamp);
    }

    /// @inheritdoc ICitizenRegistry
    function hashOf(address citizen) external view returns (bytes32) {
        return _hashes[citizen];
    }

    /// @inheritdoc ICitizenRegistry
    function isRegistered(address citizen) external view returns (bool) {
        return _hashes[citizen] != bytes32(0);
    }
}
