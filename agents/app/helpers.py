"""Helpers compartidos. Mantener mínimo — si crece, splittear."""

from eth_utils import keccak


def compute_citizen_hash(dni: str, public_salt: str) -> str:
    """
    Calcula el hash on-chain de un ciudadano.

    Equivalente a Solidity keccak256(abi.encodePacked(dni, public_salt))
    y a viem keccak256(encodePacked(['string','string'], [dni, public_salt])).

    NO logueamos el DNI raw acá. Solo el resultado.
    """
    payload = dni.encode("utf-8") + public_salt.encode("utf-8")
    return "0x" + keccak(payload).hex()
