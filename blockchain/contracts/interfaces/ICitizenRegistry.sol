// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ICitizenRegistry
/// @notice Registro on-chain de ciudadanos por hash de DNI. Una dirección,
///         un hash. El hash se calcula off-chain como
///         keccak256(abi.encodePacked(dni, PUBLIC_SALT)).
interface ICitizenRegistry {
    /// @notice Emitido cuando una dirección se registra.
    /// @param citizen La dirección que llamó register
    /// @param dniHash El hash que ahora queda asociado
    /// @param timestamp block.timestamp de la transacción
    event CitizenRegistered(address indexed citizen, bytes32 dniHash, uint256 timestamp);

    /// @notice Asocia msg.sender con un hash de DNI. Una sola vez por dirección.
    /// @param dniHash keccak256(abi.encodePacked(dni, PUBLIC_SALT)) calculado off-chain
    /// @dev Revierte si la dirección ya está registrada o si dniHash es bytes32(0).
    function register(bytes32 dniHash) external;

    /// @notice Devuelve el hash asociado a una dirección, o bytes32(0) si no está registrada.
    function hashOf(address citizen) external view returns (bytes32);

    /// @notice True si la dirección está registrada.
    function isRegistered(address citizen) external view returns (bool);
}
