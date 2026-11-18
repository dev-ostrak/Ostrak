// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {OstrakReceipts} from "../src/OstrakReceipts.sol";

/// Deploys OstrakReceipts owned by the receipt signer (the wallet that sends daily seals).
/// forge script script/Deploy.s.sol --rpc-url robinhood_mainnet --private-key $RECEIPT_SIGNER_PRIVATE_KEY --broadcast
contract Deploy is Script {
    function run() external returns (OstrakReceipts receipts) {
        vm.startBroadcast();
        receipts = new OstrakReceipts(msg.sender);
        vm.stopBroadcast();
        console.log("OstrakReceipts", address(receipts));
        console.log("owner", msg.sender);
    }
}
