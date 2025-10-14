// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPancakeSwapV2Router.sol";

contract MockPancakeSwapV2Router is IPancakeSwapV2Router {
    function factory() external pure override returns (address) {
        return address(0);
    }

    function WETH() external pure override returns (address) {
        return address(0);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOutMin;
    }

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountInMax;
        amounts[1] = amountOut;
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = msg.value;
        amounts[1] = amountOutMin;
    }

    function swapTokensForExactETH(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountInMax;
        amounts[1] = amountOut;
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOutMin;
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = msg.value;
        amounts[1] = amountOut;
    }

    function quote(
        uint amountA,
        uint reserveA,
        uint reserveB
    ) external pure override returns (uint amountB) {
        return amountA;
    }

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) external pure override returns (uint amountOut) {
        return amountIn;
    }

    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) external pure override returns (uint amountIn) {
        return amountOut;
    }

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external pure override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
    }

    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external pure override returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountOut;
        amounts[1] = amountOut;
    }
} 