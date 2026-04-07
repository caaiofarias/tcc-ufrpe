// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";


contract AcademicSBT is ERC721, ERC721Enumerable, AccessControl {
    // state variables
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    string private _baseTokenUri;
    uint256 private _nextTokenId = 1;
    mapping(uint256 => AcademicCredential) private _credentials;
    mapping(bytes32 => bool) private _vcHashUsed;

    //events
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed holder,
        bytes32 vcHash,
        CredentialType vcType
    );
    event CredentialRevoked(
        uint256 indexed tokenId,
        address indexed holder,
        string  reason
    );

    // types
    enum CredentialType {
        BACHELOR,          // Bacharelado
        LICENTIATE,        // Licenciatura (teaching degree)
        TECHNOLOGIST,      // Tecnólogo (short-cycle degree)
        POSTGRAD_LATO,     // Postgraduate - Lato Sensu (Specialization / MBA)
        POSTGRAD_STRICTO,  // Postgraduate - Stricto Sensu (Master / PhD)
        SEQUENTIAL         // Sequential studies (non-degree programs)
    }
    struct AcademicCredential {
        bytes32 hashVerifiableCredential;
        uint256 issuedAt;
        uint256 revokedAt;
        bool revoked;
        CredentialType credentialType;
    }

    constructor(string memory baseURI) ERC721("Academic Credential", "ACAD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _baseTokenUri = baseURI;
    }

    function mint(address to, bytes32 vcHash, CredentialType credentialType) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(to != address(0), "AcademicSBT: endereco invalido");
        require(vcHash != bytes32(0), "AcademicSBT: hash invalido");
        require(!_vcHashUsed[vcHash], "AcademicSBT: credencial ja emitida");

        uint256 tokenId = _nextTokenId++;

        // impl de _safeMint pelo contrato ERC721
        _safeMint(to, tokenId);

        _credentials[tokenId] = AcademicCredential({
            hashVerifiableCredential: vcHash,
            issuedAt: block.timestamp,
            revoked: false,
            credentialType: credentialType,
            revokedAt: 0
        });

        _vcHashUsed[vcHash] = true;

        emit CredentialIssued(tokenId, to, vcHash, credentialType);
        emit Locked(tokenId);

        return tokenId;
    }

    function revoke(uint256 tokenId, string calldata reason) external onlyRole(ISSUER_ROLE) {
        _requireOwned(tokenId);
        require(!_credentials[tokenId].revoked, "AcademicSBT: credencial ja revogada");

        _credentials[tokenId].revoked = true;
        _credentials[tokenId].revokedAt = block.timestamp;

        emit Unlocked(tokenId);
        emit CredentialRevoked(tokenId, ownerOf(tokenId), reason);
    }

    function getCredential(uint256 tokenId)
        external view
        returns (
            bytes32 vcHash,
            uint256 issuedAt,
            uint256 revokedAt,
            bool    revoked,
            CredentialType vcType
        )
    {
        _requireOwned(tokenId);
        AcademicCredential storage credDto = _credentials[tokenId];
        return (
            credDto.hashVerifiableCredential,
            credDto.issuedAt,
            credDto.revokedAt,
            credDto.revoked,
            credDto.credentialType
        );
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            require(_credentials[tokenId].revoked, "AcademicSBT: token soulbound nao transferivel");
        }

        return super._update(to, tokenId, auth);
    }


    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return !_credentials[tokenId].revoked;
    }

    function setBaseURI(string calldata newBaseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenUri = newBaseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseURI(), Strings.toString(tokenId));
    }

    //overrides
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

     function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenUri;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return
            interfaceId == 0xb45a3c0e || // ERC-5192
            super.supportsInterface(interfaceId);
    }
}