// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBinanceProxyRouter.sol";
import "./interfaces/IPancakeSwapV2Router.sol";
import "./interfaces/IWBNB.sol";

/**
 * @title AtomicSwap
 * @dev 实现原子化双向 Swap 交易的智能合约
 */
contract AtomicSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 常量定义
    uint256 private constant DEADLINE_DURATION = 20 minutes;
    address public immutable BINANCE_PROXY_ROUTER;
    address public immutable PANCAKESWAP_ROUTER;
    address public immutable WBNB;

    // 事件定义
    event SwapExecuted(
        address indexed sourceToken,
        address indexed targetToken,
        uint256 sourceAmount,
        uint256 targetAmount,
        uint256 finalSourceAmount
    );
    event EmergencyWithdraw(address indexed token, uint256 amount);

    /**
     * @dev 构造函数
     * @param _binanceProxyRouter Binance DEX 代理路由器地址
     * @param _pancakeSwapRouter PancakeSwap V2 路由器地址
     */
    constructor(
        address _binanceProxyRouter,
        address _pancakeSwapRouter
    ) Ownable() {
        require(_binanceProxyRouter != address(0), "Invalid proxy router address");
        require(_pancakeSwapRouter != address(0), "Invalid pancake router address");
        
        BINANCE_PROXY_ROUTER = _binanceProxyRouter;
        PANCAKESWAP_ROUTER = _pancakeSwapRouter;
        WBNB = IPancakeSwapV2Router(_pancakeSwapRouter).WETH();
    }

    /**
     * @dev 执行原子化双向 Swap
     * @param sourceToken 源代币地址
     * @param targetToken 目标代币地址
     * @param sourceAmount 输入的源代币数量
     * @param targetMinAmount 第一次 Swap 最小返回的目标代币数量
     * @param finalSourceMinAmount 第二次 Swap 最小返回的源代币数量
     */
    function executeAtomicSwapPair(
        address sourceToken,
        address targetToken,
        uint256 sourceAmount,
        uint256 targetMinAmount,
        uint256 finalSourceMinAmount
    ) external payable nonReentrant {
        require(sourceToken != address(0) && targetToken != address(0), "Invalid token address");
        require(sourceAmount > 0, "Invalid input amount");
        require(targetMinAmount > 0 && finalSourceMinAmount > 0, "Invalid min output amount");
        require(msg.value == (sourceToken == WBNB ? sourceAmount : 0), "Invalid BNB amount");

        // 检查用户余额
        if (sourceToken != WBNB) {
            require(
                IERC20(sourceToken).balanceOf(msg.sender) >= sourceAmount,
                "Insufficient source token balance"
            );
            require(
                IERC20(sourceToken).allowance(msg.sender, address(this)) >= sourceAmount,
                "Insufficient source token allowance"
            );
        }

        // 转移用户的源代币到合约
        if (sourceToken != WBNB) {
            IERC20(sourceToken).safeTransferFrom(msg.sender, address(this), sourceAmount);
        }

        // 授权代理路由器使用源代币
        if (sourceToken != WBNB) {
            IERC20(sourceToken).safeApprove(BINANCE_PROXY_ROUTER, sourceAmount);
        }

        // 构造第一次 Swap 的调用数据
        bytes memory firstSwapData = abi.encodeWithSelector(
            IPancakeSwapV2Router.swapExactTokensForTokens.selector,
            sourceAmount,
            targetMinAmount,
            _getPath(sourceToken, targetToken),
            address(this),
            block.timestamp + DEADLINE_DURATION
        );

        // 执行第一次 Swap (source -> target)
        IBinanceProxyRouter(BINANCE_PROXY_ROUTER).proxySwapV2{value: sourceToken == WBNB ? sourceAmount : 0}(
            PANCAKESWAP_ROUTER,
            uint256(uint160(sourceToken)),
            sourceAmount,
            uint256(uint160(targetToken)),
            targetMinAmount,
            firstSwapData
        );

        // 获取获得的目标代币数量
        uint256 targetTokenBalance = IERC20(targetToken).balanceOf(address(this));
        require(targetTokenBalance >= targetMinAmount, "Insufficient target token received");

        // 授权代理路由器使用目标代币
        IERC20(targetToken).safeApprove(BINANCE_PROXY_ROUTER, targetTokenBalance);

        // 构造第二次 Swap 的调用数据
        bytes memory secondSwapData = abi.encodeWithSelector(
            IPancakeSwapV2Router.swapExactTokensForTokens.selector,
            targetTokenBalance,
            finalSourceMinAmount,
            _getPath(targetToken, sourceToken),
            address(this),
            block.timestamp + DEADLINE_DURATION
        );

        // 执行第二次 Swap (target -> source)
        IBinanceProxyRouter(BINANCE_PROXY_ROUTER).proxySwapV2(
            PANCAKESWAP_ROUTER,
            uint256(uint160(targetToken)),
            targetTokenBalance,
            uint256(uint160(sourceToken)),
            finalSourceMinAmount,
            secondSwapData
        );

        // 获取最终的源代币数量
        uint256 finalSourceTokenBalance = IERC20(sourceToken).balanceOf(address(this));
        require(finalSourceTokenBalance >= finalSourceMinAmount, "Insufficient final source token received");

        // 将最终的源代币发送给用户
        if (sourceToken == WBNB) {
            IWBNB(WBNB).withdraw(finalSourceTokenBalance);
            (bool success, ) = msg.sender.call{value: finalSourceTokenBalance}("");
            require(success, "BNB transfer failed");
        } else {
            IERC20(sourceToken).safeTransfer(msg.sender, finalSourceTokenBalance);
        }

        emit SwapExecuted(
            sourceToken,
            targetToken,
            sourceAmount,
            targetTokenBalance,
            finalSourceTokenBalance
        );
    }

    /**
     * @dev 紧急提取代币
     * @param token 要提取的代币地址
     * @param amount 要提取的数量
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Invalid amount");
        
        if (token == WBNB) {
            IWBNB(WBNB).withdraw(amount);
            (bool success, ) = owner().call{value: amount}("");
            require(success, "BNB transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        
        emit EmergencyWithdraw(token, amount);
    }

    /**
     * @dev 获取交易路径
     * @param tokenIn 输入代币
     * @param tokenOut 输出代币
     * @return 交易路径数组
     */
    function _getPath(address tokenIn, address tokenOut) private pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }

    // 接收 BNB
    receive() external payable {}
} 