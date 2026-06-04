from unittest.mock import MagicMock
from app.listener import EventListener


def test_extract_vote_cast_event_args_bytes_hash():
    listener = EventListener(
        w3=MagicMock(),
        vote_address="0x" + "0" * 40,
        registry_address="0x" + "0" * 40,
        vote_abi=[],
    )

    log = {
        "args": {"voter": "0x" + "1" * 40, "proposalId": 1, "choice": 0},
        "blockNumber": 100,
        "transactionHash": b"\x12\x34",
    }
    parsed = listener.parse_vote_cast_log(log)
    assert parsed.voter == "0x" + "1" * 40
    assert parsed.proposal_id == 1
    assert parsed.choice == 0
    assert parsed.block_number == 100
    assert parsed.tx_hash == "0x1234"


def test_extract_vote_cast_event_args_string_hash():
    listener = EventListener(
        w3=MagicMock(), vote_address="0x" + "0" * 40,
        registry_address="0x" + "0" * 40, vote_abi=[],
    )
    log = {
        "args": {"voter": "0xaa", "proposalId": 1, "choice": 1},
        "blockNumber": 200,
        "transactionHash": "0xdeadbeef",
    }
    parsed = listener.parse_vote_cast_log(log)
    assert parsed.tx_hash == "0xdeadbeef"


def test_extract_proposal_closed_event_args():
    listener = EventListener(
        w3=MagicMock(),
        vote_address="0x" + "0" * 40,
        registry_address="0x" + "0" * 40,
        vote_abi=[],
    )

    log = {
        "args": {"proposalId": 1, "yes": 3, "no": 1, "abstain": 1},
        "blockNumber": 200,
        "transactionHash": b"\xab\xcd",
    }
    parsed = listener.parse_proposal_closed_log(log)
    assert parsed.proposal_id == 1
    assert parsed.yes == 3
    assert parsed.no == 1
    assert parsed.abstain == 1
    assert parsed.block_number == 200
    assert parsed.tx_hash == "0xabcd"
