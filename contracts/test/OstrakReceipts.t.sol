// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {OstrakReceipts} from "../src/OstrakReceipts.sol";

contract OstrakReceiptsTest is Test {
    OstrakReceipts receipts;
    address owner = makeAddr("owner");
    address stranger = makeAddr("stranger");
    bytes32 root = keccak256("root");

    event Sealed(bytes32 indexed root, uint64 fromTs, uint64 toTs, uint32 count, uint256 indexed index);

    function setUp() public {
        receipts = new OstrakReceipts(owner);
    }

    function test_SealStoresRootAndEmits() public {
        vm.warp(1_800_000_000);
        vm.expectEmit(true, true, false, true);
        emit Sealed(root, 100, 200, 42, 0);
        vm.prank(owner);
        receipts.seal(root, 100, 200, 42);

        assertTrue(receipts.isSealed(root));
        (uint64 fromTs, uint64 toTs, uint32 count, uint64 sealedAt) = receipts.seals(root);
        assertEq(fromTs, 100);
        assertEq(toTs, 200);
        assertEq(count, 42);
        assertEq(sealedAt, 1_800_000_000);
        assertEq(receipts.sealCount(), 1);
    }

    function test_UnknownRootIsNotSealed() public view {
        assertFalse(receipts.isSealed(root));
    }

    function test_OnlyOwnerCanSeal() public {
        vm.prank(stranger);
        vm.expectRevert(OstrakReceipts.NotOwner.selector);
        receipts.seal(root, 100, 200, 1);
    }

    function test_RejectsBadSeals() public {
        vm.startPrank(owner);
        vm.expectRevert(OstrakReceipts.ZeroRoot.selector);
        receipts.seal(bytes32(0), 100, 200, 1);
        vm.expectRevert(OstrakReceipts.EmptySeal.selector);
        receipts.seal(root, 100, 200, 0);
        vm.expectRevert(OstrakReceipts.InvalidRange.selector);
        receipts.seal(root, 200, 200, 1);
        receipts.seal(root, 100, 200, 1);
        vm.expectRevert(OstrakReceipts.AlreadySealed.selector);
        receipts.seal(root, 200, 300, 1);
        vm.stopPrank();
    }

    function test_TwoStepOwnershipTransfer() public {
        vm.prank(owner);
        receipts.transferOwnership(stranger);
        assertEq(receipts.owner(), owner);

        vm.prank(makeAddr("other"));
        vm.expectRevert(OstrakReceipts.NotPendingOwner.selector);
        receipts.acceptOwnership();

        vm.prank(stranger);
        receipts.acceptOwnership();
        assertEq(receipts.owner(), stranger);
        assertEq(receipts.pendingOwner(), address(0));

        vm.prank(owner);
        vm.expectRevert(OstrakReceipts.NotOwner.selector);
        receipts.seal(root, 100, 200, 1);
    }

    function testFuzz_SealAnyValidWindow(bytes32 r, uint64 fromTs, uint64 toTs, uint32 count) public {
        vm.assume(r != bytes32(0) && count > 0 && fromTs < toTs);
        vm.prank(owner);
        receipts.seal(r, fromTs, toTs, count);
        assertTrue(receipts.isSealed(r));
    }

    function test_SealGas() public {
        vm.prank(owner);
        uint256 before = gasleft();
        receipts.seal(root, 100, 200, 1000);
        emit log_named_uint("seal gas", before - gasleft());
    }
}
