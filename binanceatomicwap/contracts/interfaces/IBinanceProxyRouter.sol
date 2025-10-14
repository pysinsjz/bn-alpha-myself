// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBinanceProxyRouter
 * @dev Binance DEX 代理路由器接口
 */
interface IBinanceProxyRouter {
    /**
     * @dev 代理执行 Swap 操作
     * @param router 底层路由器地址
     * @param fromTokenWithFee 源代币地址
     * @param fromAmt 源代币数量
     * @param toTokenWithFee 目标代币地址
     * @param minReturnAmt 最小返回数量
     * @param callData 底层 Swap 调用数据
     */
    function proxySwapV2(
        address router,
        uint256 fromTokenWithFee,
        uint256 fromAmt,
        uint256 toTokenWithFee,
        uint256 minReturnAmt,
        bytes calldata callData
    ) external payable;

    /**
     * @dev 获取允许的路由器列表
     * @return 允许的路由器地址数组
     */
    function getRouterList() external view returns (address[] memory);

    /**
     * @dev 添加允许的路由器
     * @param router 要添加的路由器地址数组
     */
    function addRouters(address[] calldata router) external;

    /**
     * @dev 移除允许的路由器
     * @param router 要移除的路由器地址数组
     */
    function removeRouters(address[] calldata router) external;

    // 事件定义
    event RouterAllowed(address indexed operator, address[] router);
    event RouterDenied(address indexed operator, address[] router);
    event FeeCollected(address indexed token, address recipient, uint256 amount);

    // 错误定义
    error AddressEmptyCode(address target);
    error AddressInsufficientBalance(address account);
    error ApproveFailed();
    error FailedInnerCall();
    error InvalidFeeValue(uint256 fee);
    error InvalidRouter(address router);
    error MinReturnNotReached(uint256 minReturnAmt, uint256 result);
    error OnlyContractOwner();
    error SafeERC20FailedOperation(address token);
} 