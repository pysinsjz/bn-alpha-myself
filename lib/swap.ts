import type { Hex } from 'viem'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'
import { BN_DEX_ROUTER_ADDRESS } from '@/constants'

/**
 * 构建代币授权交易
 */
export function buildApproveTransaction(tokenAddress: Hex, amount: bigint) {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [BN_DEX_ROUTER_ADDRESS, amount],
  })

  return {
    to: tokenAddress,
    data,
  }
}

/**
 * 构建 Swap 交易数据
 * 这是一个简化版本，实际使用时需要根据具体的路由器合约 ABI 来构建
 */
export function buildSwapTransaction({
  fromToken,
  toToken,
  fromAmount,
  fromDecimals,
  minReturnAmount,
  slippage = 0.5, // 默认 0.5% 滑点
}: {
  fromToken: Hex
  toToken: Hex
  fromAmount: string
  fromDecimals: number
  minReturnAmount: string
  slippage?: number
}) {
  // 将金额转换为 bigint
  const amount = parseUnits(fromAmount, fromDecimals)
  const minReturn = parseUnits(minReturnAmount, fromDecimals)

  // 计算实际最小返回金额（考虑滑点）
  const minReturnWithSlippage = (minReturn * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

  // 将代币地址编码为带手续费的格式
  // 注意：这里的编码方式需要根据实际的合约实现来调整
  const fromTokenWithFee = BigInt(fromToken)
  const toTokenWithFee = BigInt(toToken)

  // 这里使用 proxySwapV2 方法作为示例
  // 实际使用时需要根据具体情况选择合适的方法
  const data = encodeFunctionData({
    abi: [
      {
        name: 'proxySwapV2',
        type: 'function',
        inputs: [
          { name: 'router', type: 'address' },
          { name: 'fromTokenWithFee', type: 'uint256' },
          { name: 'fromAmt', type: 'uint256' },
          { name: 'toTokenWithFee', type: 'uint256' },
          { name: 'minReturnAmt', type: 'uint256' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    functionName: 'proxySwapV2',
    args: [
      BN_DEX_ROUTER_ADDRESS,
      fromTokenWithFee,
      amount,
      toTokenWithFee,
      minReturnWithSlippage,
      '0x' as Hex, // callData - 需要根据实际情况填充
    ],
  })

  return {
    to: BN_DEX_ROUTER_ADDRESS,
    data,
    value: 0n, // 如果是 BNB，需要设置 value
  }
}

/**
 * 检查代币授权额度
 */
export async function checkAllowance(
  tokenAddress: Hex,
  ownerAddress: Hex,
  spenderAddress: Hex = BN_DEX_ROUTER_ADDRESS,
): Promise<bigint> {
  // 这里需要调用合约的 allowance 方法
  // 实际实现需要使用 publicClient.readContract
  return 0n
}

/**
 * 计算预估的交易输出
 * 这是一个模拟函数，实际应该调用 DEX 的报价 API
 */
export async function estimateSwapOutput({
  fromToken,
  toToken,
  fromAmount,
  fromDecimals,
}: {
  fromToken: Hex
  toToken: Hex
  fromAmount: string
  fromDecimals: number
}): Promise<{
  outputAmount: string
  priceImpact: number
  minimumReceived: string
}> {
  // 这里应该调用实际的 DEX API 获取报价
  // 目前返回模拟数据
  return {
    outputAmount: '0',
    priceImpact: 0,
    minimumReceived: '0',
  }
}

