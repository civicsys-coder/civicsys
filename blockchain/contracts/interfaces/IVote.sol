// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IVote
/// @notice Voto consultivo sobre una única propuesta legislativa preseeded en el
///         constructor. Sprint 1 — multi-propuesta dinámica defer a Sprint 2.
interface IVote {
    enum Choice { Yes, No, Abstain }

    struct Proposal {
        uint256 id;
        string title;
        string ipfsCid;
        uint256 openAt;
        uint256 closeAt;
        bool closed;
    }

    event VoteCast(address indexed voter, uint256 indexed proposalId, Choice choice);
    event ProposalClosed(uint256 indexed proposalId, uint256 yes, uint256 no, uint256 abstain);

    function castVote(uint256 proposalId, Choice choice) external;
    function getProposal(uint256 id) external view returns (Proposal memory);
    function tally(uint256 id) external view returns (uint256 yes, uint256 no, uint256 abstain);
    function close(uint256 id) external;
}
