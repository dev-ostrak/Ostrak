// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title OstrakReceipts
/// @notice Stores Merkle roots of Ostrak's signed spending receipts, one per sealing window.
///         Anyone can check a receipt against a root with its Merkle proof and `isSealed`.
/// @dev Owner-only writes, no upgradeability, holds no funds. One storage slot per seal.
contract OstrakReceipts {
    struct Seal {
        uint64 fromTs; // window start, unix seconds (inclusive)
        uint64 toTs; // window end, unix seconds (exclusive)
        uint32 count; // leaves in the tree (receipts + daily statements)
        uint64 sealedAt; // block timestamp; 0 = not sealed
    }

    address public owner;
    address public pendingOwner;
    uint256 public sealCount;
    mapping(bytes32 root => Seal) public seals;

    event Sealed(bytes32 indexed root, uint64 fromTs, uint64 toTs, uint32 count, uint256 indexed index);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroRoot();
    error EmptySeal();
    error InvalidRange();
    error AlreadySealed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    /// @notice Records `root` for the receipts created in [fromTs, toTs).
    function seal(bytes32 root, uint64 fromTs, uint64 toTs, uint32 count) external onlyOwner {
        if (root == bytes32(0)) revert ZeroRoot();
        if (count == 0) revert EmptySeal();
        if (fromTs >= toTs) revert InvalidRange();
        if (seals[root].sealedAt != 0) revert AlreadySealed();
        seals[root] = Seal(fromTs, toTs, count, uint64(block.timestamp));
        emit Sealed(root, fromTs, toTs, count, sealCount++);
    }

    function isSealed(bytes32 root) external view returns (bool) {
        return seals[root].sealedAt != 0;
    }

    /// @notice Two-step ownership transfer, so a typo can't lock sealing forever.
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}
