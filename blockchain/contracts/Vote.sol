// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IVote} from "./interfaces/IVote.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";

/// @title Vote
/// @notice Voto consultivo sobre una única propuesta preseeded en el constructor.
contract Vote is IVote {
    /// @notice Registro de ciudadanos al que el contrato consulta para autorizar.
    ICitizenRegistry public immutable registry;

    /// @dev Mapping id => Proposal. Sprint 1 sólo tiene id=1.
    mapping(uint256 => Proposal) private _proposals;

    /// @dev Tallies por propuesta.
    mapping(uint256 => uint256) private _yesCount;
    mapping(uint256 => uint256) private _noCount;
    mapping(uint256 => uint256) private _abstainCount;

    /// @dev Por (proposalId, voter) marca si ya votó.
    mapping(uint256 => mapping(address => bool)) private _voted;

    constructor(
        address registryAddr,
        string memory title,
        string memory ipfsCid,
        uint256 openAt,
        uint256 closeAt
    ) {
        require(registryAddr != address(0), "Vote: registry cero");
        require(closeAt > openAt, "Vote: closeAt <= openAt");
        require(bytes(title).length > 0, "Vote: title vacio");

        registry = ICitizenRegistry(registryAddr);
        _proposals[1] = Proposal({
            id: 1,
            title: title,
            ipfsCid: ipfsCid,
            openAt: openAt,
            closeAt: closeAt,
            closed: false
        });
    }

    /// @inheritdoc IVote
    function getProposal(uint256 id) external view returns (Proposal memory) {
        return _proposals[id];
    }

    /// @inheritdoc IVote
    function tally(uint256 id) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        yes = _yesCount[id];
        no = _noCount[id];
        abstain = _abstainCount[id];
    }

    /// @inheritdoc IVote
    function castVote(uint256 proposalId, Choice choice) external {
        Proposal storage p = _proposals[proposalId];
        require(p.id != 0, "Vote: propuesta inexistente");
        require(!p.closed, "Vote: propuesta cerrada");
        require(block.timestamp >= p.openAt, "Vote: aun no abierta");
        require(block.timestamp <= p.closeAt, "Vote: ya termino");
        require(registry.isRegistered(msg.sender), "Vote: no registrado");
        require(!_voted[proposalId][msg.sender], "Vote: ya votaste");

        _voted[proposalId][msg.sender] = true;
        if (choice == Choice.Yes) _yesCount[proposalId]++;
        else if (choice == Choice.No) _noCount[proposalId]++;
        else _abstainCount[proposalId]++;

        emit VoteCast(msg.sender, proposalId, choice);
    }

    /// @inheritdoc IVote
    function close(uint256 id) external {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "Vote: propuesta inexistente");
        require(!p.closed, "Vote: ya cerrada");
        require(block.timestamp > p.closeAt, "Vote: aun activa");

        p.closed = true;
        emit ProposalClosed(id, _yesCount[id], _noCount[id], _abstainCount[id]);
    }
}
