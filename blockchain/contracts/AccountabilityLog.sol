// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AccountabilityLog — ancla pública e inmutable de los reportes de «La Tóxica».
/// @notice Cada vez que el agente de accountability detecta una brecha entre el voto
///         ciudadano y la acción del Congreso, ancla aquí un registro append-only:
///         el id de la propuesta, el hash del post público (verificable contra el texto)
///         y un resumen legible. Cualquiera puede leerlo y verificarlo en el explorer.
/// @dev    Demo del hackathon Syscoin (zkSYS). Sin control de acceso: es un log público
///         (el valor está en la inmutabilidad y la marca de tiempo on-chain, no en quién
///         escribe). En producción, el `anchor` iría detrás de un multisig 2-de-3.
contract AccountabilityLog {
    struct Report {
        uint256 proposalId;   // propuesta/ley analizada
        bytes32 reportHash;    // keccak256 del post público (anti-manipulación)
        string  summary;       // resumen legible de la brecha
        uint64  timestamp;     // block.timestamp del anclaje
        address reporter;      // quién ancló (el relayer de La Tóxica)
    }

    Report[] public reports;

    event ReportAnchored(
        uint256 indexed proposalId,
        bytes32 indexed reportHash,
        uint256 index,
        string  summary,
        address reporter
    );

    /// @notice Ancla un reporte de accountability. Devuelve el índice asignado.
    function anchor(
        uint256 proposalId,
        bytes32 reportHash,
        string calldata summary
    ) external returns (uint256 index) {
        index = reports.length;
        reports.push(
            Report({
                proposalId: proposalId,
                reportHash: reportHash,
                summary: summary,
                timestamp: uint64(block.timestamp),
                reporter: msg.sender
            })
        );
        emit ReportAnchored(proposalId, reportHash, index, summary, msg.sender);
    }

    /// @notice Cantidad total de reportes anclados.
    function count() external view returns (uint256) {
        return reports.length;
    }
}
