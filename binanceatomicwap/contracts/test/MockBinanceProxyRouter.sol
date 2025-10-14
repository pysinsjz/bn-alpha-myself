// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBinanceProxyRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableERC20 is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract MockBinanceProxyRouter is IBinanceProxyRouter {
    function proxySwapV2(
        address router,
        uint256 fromTokenWithFee,
        uint256 fromAmt,
        uint256 toTokenWithFee,
        uint256 minReturnAmt,
        bytes calldata callData
    ) external payable override {
        // 只mint目标Token到msg.sender（AtomicSwap合约），不再transfer，避免余额不足
        address toToken = address(uint160(toTokenWithFee));
        IMintableERC20(toToken).mint(msg.sender, minReturnAmt);
    }

    function getRouterList() external pure override returns (address[] memory) {
        address[] memory routers = new address[](0);
        return routers;
    }

    function addRouters(address[] calldata router) external override {}

    function removeRouters(address[] calldata router) external override {}
} 