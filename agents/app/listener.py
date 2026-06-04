"""
EventListener: web3.py parse de eventos VoteCast y ProposalClosed.

Sprint 1: parsing puro. El polling loop async se levanta en main.py
usando asyncio.create_task con estos parsers. Esto permite testear
sin necesitar un W3 real conectado.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class VoteCastEvent:
    voter: str
    proposal_id: int
    choice: int
    block_number: int
    tx_hash: str


@dataclass
class ProposalClosedEvent:
    proposal_id: int
    yes: int
    no: int
    abstain: int
    block_number: int
    tx_hash: str


class EventListener:
    def __init__(
        self,
        w3: Any,
        vote_address: str,
        registry_address: str,
        vote_abi: list,
    ):
        self.w3 = w3
        self.vote_address = vote_address
        self.registry_address = registry_address
        self.vote_abi = vote_abi

    def parse_vote_cast_log(self, log: dict) -> VoteCastEvent:
        tx_hash_raw = log["transactionHash"]
        tx_hash = (
            "0x" + tx_hash_raw.hex()
            if isinstance(tx_hash_raw, bytes)
            else str(tx_hash_raw)
        )
        return VoteCastEvent(
            voter=log["args"]["voter"],
            proposal_id=log["args"]["proposalId"],
            choice=log["args"]["choice"],
            block_number=log["blockNumber"],
            tx_hash=tx_hash,
        )

    def parse_proposal_closed_log(self, log: dict) -> ProposalClosedEvent:
        tx_hash_raw = log["transactionHash"]
        tx_hash = (
            "0x" + tx_hash_raw.hex()
            if isinstance(tx_hash_raw, bytes)
            else str(tx_hash_raw)
        )
        return ProposalClosedEvent(
            proposal_id=log["args"]["proposalId"],
            yes=log["args"]["yes"],
            no=log["args"]["no"],
            abstain=log["args"]["abstain"],
            block_number=log["blockNumber"],
            tx_hash=tx_hash,
        )
