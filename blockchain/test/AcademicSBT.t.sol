// test/AcademicSBT.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AcademicSBT} from "../src/AcademicSBT.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AcademicSBTTest is Test {

    AcademicSBT public sbt;

    address public issuer  = address(1);
    address public student = address(2);
    address public stranger = address(3);

    bytes32 constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    bytes32 constant MOCK_VC_HASH = keccak256("sd-jwt-do-joao-silva");
    AcademicSBT.CredentialType constant MOCK_TYPE = AcademicSBT.CredentialType.BACHELOR;

    function setUp() public {
        // Deploy feito pelo endereço padrão do Foundry (address(this))
        sbt = new AcademicSBT("baseURItest");

        // Conceder ISSUER_ROLE ao endereço issuer
        sbt.grantRole(ISSUER_ROLE, issuer);
    }

    // ── Emissão ──────────────────────────────────────────────────────────────

    function test_mint_sucesso() public {
        vm.prank(issuer); // próxima chamada vem do endereço issuer
        uint256 tokenId = sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        assertEq(sbt.ownerOf(tokenId), student);
        assertTrue(sbt.locked(tokenId));

        (bytes32 hash, , , bool revoked, AcademicSBT.CredentialType vcType) = sbt.getCredential(tokenId);
        assertEq(hash, MOCK_VC_HASH);
        assertFalse(revoked);
        assertEq(uint256(vcType), uint256(MOCK_TYPE));
    }

    function test_mint_sem_role_reverte() public {
        vm.prank(stranger);
        vm.expectRevert(); // deve reverter sem ISSUER_ROLE
        sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);
    }

    function test_mint_hash_zero_reverte() public {
        vm.prank(issuer);
        vm.expectRevert("AcademicSBT: hash invalido");
        sbt.mint(student, bytes32(0), MOCK_TYPE);
    }

    function test_mint_hash_duplicado_reverte() public {
        vm.prank(issuer);
        sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        vm.prank(issuer);
        vm.expectRevert("AcademicSBT: credencial ja emitida");
        sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);
    }

    // ── Transferência bloqueada ───────────────────────────────────────────────

    function test_transfer_bloqueada() public {
        vm.prank(issuer);
        uint256 tokenId = sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        vm.prank(student);
        vm.expectRevert("AcademicSBT: token soulbound nao transferivel");
        sbt.transferFrom(student, stranger, tokenId);
    }

    // ── Revogação ─────────────────────────────────────────────────────────────

    function test_revogar_sucesso() public {
        vm.prank(issuer);
        uint256 tokenId = sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        vm.prank(issuer);
        sbt.revoke(tokenId, "Erro de emissao detectado");

        (, , , bool revoked,) = sbt.getCredential(tokenId);
        assertTrue(revoked);
        assertFalse(sbt.locked(tokenId)); // desbloqueado após revogação
    }

    function test_revogar_duas_vezes_reverte() public {
        vm.prank(issuer);
        uint256 tokenId = sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        vm.prank(issuer);
        sbt.revoke(tokenId, "Primeiro motivo");

        vm.prank(issuer);
        vm.expectRevert("AcademicSBT: credencial ja revogada");
        sbt.revoke(tokenId, "Segundo motivo");
    }

    function test_revogar_sem_role_reverte() public {
        vm.prank(issuer);
        uint256 tokenId = sbt.mint(student, MOCK_VC_HASH, MOCK_TYPE);

        vm.prank(stranger);
        vm.expectRevert();
        sbt.revoke(tokenId, "tentativa invalida");
    }

    // ── ERC-165 ───────────────────────────────────────────────────────────────

    function test_suporta_erc5192() public view {
        assertTrue(sbt.supportsInterface(0xb45a3c0e));
    }

    function test_suporta_erc721() public view {
        assertTrue(sbt.supportsInterface(type(IERC721).interfaceId));
    }
}