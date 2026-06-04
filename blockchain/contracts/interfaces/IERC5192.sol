// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IERC5192 — Minimal Soulbound NFT interface (EIP-5192)
/// @notice Estándar mínimo para tokens "soulbound" (no transferibles). Un token
///         bloqueado no puede cambiar de dueño tras el mint.
interface IERC5192 {
    /// @notice Emitido cuando el bloqueo de un token se activa.
    event Locked(uint256 tokenId);

    /// @notice Emitido cuando el bloqueo de un token se desactiva.
    event Unlocked(uint256 tokenId);

    /// @notice Estado de bloqueo del token. Para una Cédula soulbound => siempre true.
    /// @dev Revierte si el token no existe.
    function locked(uint256 tokenId) external view returns (bool);
}
