// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AnonymousVote — voto anónimo 1-persona-1-voto por nullifier (Sprint 04)
/// @notice Mecanismo de nullifier REAL on-chain: previene el doble voto sin revelar
///         al votante. El nullifier = keccak256(identitySecret || proposalId) se
///         deriva off-chain; la misma identidad produce el mismo nullifier en una
///         propuesta (no vota dos veces) pero distinto entre propuestas (no se
///         correlaciona). El voto se emite desde cualquier address, desligado de la
///         identidad. El tally es público; los votantes, anónimos.
/// @dev LIMITACIÓN (ADR-010 / L-17): la prueba ZK de que el nullifier deriva de una
///      Cédula válida (membership) está MOCKEADA — el contrato acepta cualquier
///      nullifier no-cero, por lo que NO gatea a ciudadanos (sin Sybil-resistance).
///      Producción: Semaphore (Merkle de Cédulas + Groth16) o attestor firmante.
contract AnonymousVote {
    /// @notice proposalId => nullifier => ya usado.
    mapping(uint256 => mapping(bytes32 => bool)) public nullifierUsed;

    struct Tally {
        uint128 yes;
        uint128 no;
        uint128 abstain;
    }

    /// @notice proposalId => conteo.
    mapping(uint256 => Tally) private _tally;

    /// @notice Emitido en cada voto. Lleva el nullifier (opaco), NUNCA el votante.
    event AnonymousVoteCast(uint256 indexed proposalId, bytes32 indexed nullifier, uint8 choice);

    /// @param proposalId propuesta sobre la que se vota.
    /// @param choice 0 = Sí, 1 = No, 2 = Abstención.
    /// @param nullifier marca única derivada de (identidad, propuesta) off-chain.
    function castAnonymous(uint256 proposalId, uint8 choice, bytes32 nullifier) external {
        require(choice <= 2, "AnonymousVote: choice invalido");
        require(nullifier != bytes32(0), "AnonymousVote: nullifier cero");
        require(!nullifierUsed[proposalId][nullifier], "AnonymousVote: ya votaste");

        nullifierUsed[proposalId][nullifier] = true;
        Tally storage t = _tally[proposalId];
        if (choice == 0) {
            t.yes += 1;
        } else if (choice == 1) {
            t.no += 1;
        } else {
            t.abstain += 1;
        }

        emit AnonymousVoteCast(proposalId, nullifier, choice);
    }

    /// @notice Conteo público de una propuesta.
    function tally(uint256 proposalId) external view returns (uint128, uint128, uint128) {
        Tally storage t = _tally[proposalId];
        return (t.yes, t.no, t.abstain);
    }
}
