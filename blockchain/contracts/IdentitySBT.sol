// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ICitizenRegistry} from "./interfaces/ICitizenRegistry.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";

/// @title IdentitySBT — «Cédula Cívica»
/// @notice NFT soulbound (ERC-5192) de identidad única. Una address, una Cédula.
///         Unicidad dual: dniHash y faceCommitment no se pueden reutilizar.
///         Implementa ICitizenRegistry para que Vote.sol lo consuma sin cambios.
/// @dev Los commitments se calculan off-chain. El contrato nunca ve PII.
contract IdentitySBT is ERC721, ICitizenRegistry, IERC5192 {
    uint256 private _nextId = 1;

    /// @notice tokenId => dniHash asociado.
    mapping(uint256 => bytes32) public dniOf;
    /// @notice holder => su tokenId (0 si no tiene).
    mapping(address => uint256) public tokenOfOwner;
    /// @notice dniHash => ya fue usado por algún mint (no se libera al quemar).
    mapping(bytes32 => bool) public usedDni;
    /// @notice faceCommitment => ya fue usado por algún mint (no se libera al quemar).
    mapping(bytes32 => bool) public usedFace;

    /// @notice URI de metadata por token (sin PII).
    mapping(uint256 => string) private _tokenURIs;

    event CedulaMinted(
        address indexed holder, uint256 indexed tokenId, bytes32 dniHash, bytes32 faceCommitment
    );
    /// @notice Emitido cuando un holder quema su Cédula (derecho al olvido).
    event CedulaBurned(address indexed holder, uint256 indexed tokenId);

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("Cedula Civica", "CEDULA") {}

    /// @notice Mintea la Cédula del llamante. Una sola vez por persona.
    /// @param dniHash commitment del DNI calculado off-chain (no cero).
    /// @param faceCommitment commitment del rostro calculado off-chain (no cero).
    /// @param uri metadata sin PII (data-URI o IPFS).
    /// @return tokenId id de la Cédula minteada.
    function mint(bytes32 dniHash, bytes32 faceCommitment, string calldata uri)
        external
        returns (uint256 tokenId)
    {
        require(dniHash != bytes32(0), "Identity: dni cero");
        require(faceCommitment != bytes32(0), "Identity: face cero");
        require(balanceOf(msg.sender) == 0, "Identity: ya tenes cedula");
        require(!usedDni[dniHash], "Identity: dni ya usado");
        require(!usedFace[faceCommitment], "Identity: rostro ya usado");

        tokenId = _nextId++;
        usedDni[dniHash] = true;
        usedFace[faceCommitment] = true;
        dniOf[tokenId] = dniHash;
        tokenOfOwner[msg.sender] = tokenId;
        _tokenURIs[tokenId] = uri;

        _safeMint(msg.sender, tokenId);

        emit CedulaMinted(msg.sender, tokenId, dniHash, faceCommitment);
        emit Locked(tokenId);
    }

    /// @notice El holder puede quemar su Cédula (derecho al olvido). Libera la
    ///         address pero NO libera los commitments: no hay re-registro con el
    ///         mismo DNI/rostro.
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Identity: no sos el holder");
        delete tokenOfOwner[msg.sender];
        delete dniOf[tokenId];
        delete _tokenURIs[tokenId];
        _burn(tokenId);
        emit CedulaBurned(msg.sender, tokenId);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // ---- ICitizenRegistry (Vote.sol consume esta interfaz) ----

    /// @inheritdoc ICitizenRegistry
    function isRegistered(address citizen) external view returns (bool) {
        return balanceOf(citizen) > 0;
    }

    /// @inheritdoc ICitizenRegistry
    function hashOf(address citizen) external view returns (bytes32) {
        return dniOf[tokenOfOwner[citizen]];
    }

    /// @inheritdoc ICitizenRegistry
    /// @dev Deshabilitado: el alta es vía mint() (con verificación dual). Se
    ///      mantiene en la interfaz por compatibilidad con consumidores legacy.
    function register(bytes32) external pure {
        revert("Identity: usa mint()");
    }

    // ---- ERC-5192 (soulbound) ----

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @dev Bloquea transferencias entre cuentas; permite mint (from==0) y burn (to==0).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Identity: soulbound (no transferible)");
        return super._update(to, tokenId, auth);
    }

    /// @dev ERC-5192 estricto: la Cédula no se puede aprobar (no es transferible),
    ///      así no quedan approvals colgantes que confundan a indexadores.
    function approve(address, uint256) public pure override {
        revert("Identity: soulbound (no aprobable)");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Identity: soulbound (no aprobable)");
    }

    /// @inheritdoc ERC721
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }
}
