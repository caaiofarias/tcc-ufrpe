// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {AcademicSBT} from "../src/AcademicSBT.sol";
import { console} from "forge-std/console.sol";

contract AcademicSBTScript is Script {
    AcademicSBT public sbt;

    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        sbt = new AcademicSBT("baseURItest");
        console.log("AcademicSBT deployed at:", address(sbt));

        vm.stopBroadcast();
    }
}
