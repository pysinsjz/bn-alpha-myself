import type { Hex } from 'viem'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'
import { BN_DEX_ROUTER_ADDRESS, PANCAKESWAP_V2_ROUTER_ADDRESS, WBNB_ADDRESS, BINANCE_ACTUAL_ROUTER_ADDRESS } from '@/constants'

// PancakeSwap V2 Router ABI
const PANCAKESWAP_V2_ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
  },
] as const

// Binance Proxy Router ABI - 根据实际链上数据更新
const BINANCE_PROXY_ROUTER_ABI = [
  {
    name: 'swap', // 方法ID: 0x810c705b
    type: 'function',
    inputs: [
      { name: 'router', type: 'address' },
      { name: 'fromToken', type: 'address' },
      { name: 'toToken', type: 'address' },
      { name: 'fromAmount', type: 'uint256' },
      { name: 'toAmount', type: 'uint256' },
      { name: 'callData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'proxySwapV2', // 方法ID: 0xe5e8894b
    type: 'function',
    inputs: [
      { name: 'router', type: 'address' },
      { name: 'fromTokenWithFee', type: 'uint256' },
      { name: 'fromAmt', type: 'uint256' },
      { name: 'toTokenWithFee', type: 'uint256' },
      { name: 'minReturnAmt', type: 'uint256' },
      { name: 'callData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const

/**
 * 构建代币授权交易
 */
export function buildApproveTransaction(
  tokenAddress: Hex, 
  amount: bigint, 
  spenderAddress: Hex = BN_DEX_ROUTER_ADDRESS
): {
  to: Hex
  data: Hex
} {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, amount],
  })

  return {
    to: tokenAddress,
    data,
  }
}

/**
 * 构造复杂的聚合器调用数据
 * 参考链上实际交易数据
 */
function buildAggregatorCallData({
  fromToken,
  toToken,
  fromAmount,
  minReturnAmount,
  to,
  deadline,
}: {
  fromToken: Hex
  toToken: Hex
  fromAmount: bigint
  minReturnAmount: bigint
  to: Hex
  deadline: bigint
}): Hex {
  // 这里需要根据实际的聚合器 API 返回的数据来构造
  // 目前返回一个简化的版本，实际使用时需要调用聚合器 API
  
  // 简化的多跳路由：fromToken -> WBNB -> toToken
  const path = [fromToken, WBNB_ADDRESS, toToken]
  
  return encodeFunctionData({
    abi: PANCAKESWAP_V2_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [fromAmount, minReturnAmount, path, to, deadline],
  })
}

/**
 * 构造 PancakeSwap 调用数据（备用方案）
 */
function buildPancakeSwapCallData({
  fromToken,
  toToken,
  fromAmount,
  minReturnAmount,
  to,
  deadline,
}: {
  fromToken: Hex
  toToken: Hex
  fromAmount: bigint
  minReturnAmount: bigint
  to: Hex
  deadline: bigint
}): Hex {
  // 构造交易路径，参照合约中的 _getPath 函数
  let path: Hex[]
  
  // 如果涉及 BNB，需要通过 WBNB 作为中间代币
  if (fromToken.toLowerCase() === WBNB_ADDRESS.toLowerCase() || 
      toToken.toLowerCase() === WBNB_ADDRESS.toLowerCase()) {
    // 直接交换，不需要中间代币
    path = [fromToken, toToken]
  } else {
    // 对于其他代币，也使用直接路径（参照合约实现）
    path = [fromToken, toToken]
  }

  // 编码 PancakeSwap 调用数据
  return encodeFunctionData({
    abi: PANCAKESWAP_V2_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [fromAmount, minReturnAmount, path, to, deadline],
  })
}

/**
 * 构建正确的 Swap 交易数据
 * 参考 AtomicSwap 合约的实现方式
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
}): {
  to: Hex
  data: Hex
  value: bigint
} {
  // 将金额转换为 bigint
  const amount = parseUnits(fromAmount, fromDecimals)
  const minReturn = parseUnits(minReturnAmount, fromDecimals)

  // 计算实际最小返回金额（考虑滑点）
  const minReturnWithSlippage = (minReturn * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

  // 设置截止时间（20分钟后）
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  // 构造聚合器调用数据（使用多跳路由）
  const callData = buildAggregatorCallData({
    fromToken,
    toToken,
    fromAmount: amount,
    minReturnAmount: minReturnWithSlippage,
    to: BN_DEX_ROUTER_ADDRESS, // 发送到代理路由器
    deadline,
  })

  // 将代币地址编码为 uint256（参考合约实现）
  const fromTokenWithFee = BigInt(fromToken)
  const toTokenWithFee = BigInt(toToken)

  // 构造代理路由器调用数据 - 使用正确的方法ID 0x810c705b
  const data = encodeFunctionData({
    abi: BINANCE_PROXY_ROUTER_ABI,
    functionName: 'swap',
    args: [
      BINANCE_ACTUAL_ROUTER_ADDRESS, // 币安实际使用的路由器地址
      fromToken,                     // 源代币地址
      toToken,                       // 目标代币地址
      amount,                        // 输入金额
      minReturnWithSlippage,         // 最小返回
      callData,                      // 使用正确构造的 callData
    ],
  })

  return {
    to: BN_DEX_ROUTER_ADDRESS,
    data,
    value: 0n, // 如果是 BNB，需要设置 value
  }
}

/**
 * 直接拼接交易数据 - 使用实际的方法选择器 0x810c705b
 * 不依赖 ABI，直接按照实际交易数据格式拼接
 */
export function buildRealSwapTransaction({
  fromToken,
  toToken,
  fromAmount,
  fromDecimals,
  minReturnAmount,
  slippage = 0.5,
}: {
  fromToken: Hex
  toToken: Hex
  fromAmount: string
  fromDecimals: number
  minReturnAmount: string
  slippage?: number
}): {
  to: Hex
  data: Hex
  value: bigint
} {
  // 将金额转换为 bigint
  const amount = parseUnits(fromAmount, fromDecimals)
  const minReturn = parseUnits(minReturnAmount, fromDecimals)

  // 计算实际最小返回金额（考虑滑点）
  const minReturnWithSlippage = (minReturn * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

  // 设置截止时间（20分钟后）
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)

  // 构造 PancakeSwap 调用数据
  const callData = buildPancakeSwapCallData({
    fromToken,
    toToken,
    fromAmount: amount,
    minReturnAmount: minReturnWithSlippage,
    to: BN_DEX_ROUTER_ADDRESS,
    deadline,
  })

  // 使用 viem 编码，确保数据格式正确
  const data = buildSwapDataWithViem({
    router: BINANCE_ACTUAL_ROUTER_ADDRESS,
    fromToken,
    toToken,
    fromAmount: amount,
    toAmount: minReturnWithSlippage,
    callData,
  })

  // 如果是 BNB 交易，需要发送 value
  const value = fromToken.toLowerCase() === WBNB_ADDRESS.toLowerCase() ? amount : 0n

  return {
    to: BN_DEX_ROUTER_ADDRESS,
    data,
    value,
  }
}

/**
 * 直接拼接交易数据 - 不依赖 ABI
 * 按照实际交易数据格式手动拼接
 */
function buildSwapDataDirect({
  router,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  callData,
}: {
  router: Hex
  fromToken: Hex
  toToken: Hex
  fromAmount: bigint
  toAmount: bigint
  callData: Hex
}): Hex {
  // 方法选择器
  const methodSelector = '0x810c705b'
  
  // 拼接参数 - 确保地址格式正确
  const routerPadded = router.slice(2).toLowerCase().padStart(64, '0')
  const fromTokenPadded = fromToken.slice(2).toLowerCase().padStart(64, '0')
  const toTokenPadded = toToken.slice(2).toLowerCase().padStart(64, '0')
  const fromAmountPadded = fromAmount.toString(16).padStart(64, '0')
  const toAmountPadded = toAmount.toString(16).padStart(64, '0')
  
  // callData 偏移量 (6个参数 * 32字节 = 192字节 = 0xc0)
  const callDataOffset = '00000000000000000000000000000000000000000000000000000000000000c0'
  
  // callData 长度
  const callDataLength = (callData.length - 2) / 2 // 去掉 0x 前缀，转换为字节数
  const callDataLengthPadded = callDataLength.toString(16).padStart(64, '0')
  
  // callData 内容
  const callDataContent = callData.slice(2)
  
  // 拼接完整数据
  const fullData = methodSelector + 
    routerPadded + 
    fromTokenPadded + 
    toTokenPadded + 
    fromAmountPadded + 
    toAmountPadded + 
    callDataOffset + 
    callDataLengthPadded + 
    callDataContent
  
  console.log('=== 数据拼接调试 ===')
  console.log('方法选择器:', methodSelector)
  console.log('router:', routerPadded)
  console.log('fromToken:', fromTokenPadded)
  console.log('toToken:', toTokenPadded)
  console.log('fromAmount:', fromAmountPadded)
  console.log('toAmount:', toAmountPadded)
  console.log('callData 偏移量:', callDataOffset)
  console.log('callData 长度:', callDataLengthPadded)
  console.log('callData 内容:', callDataContent.slice(0, 20) + '...')
  console.log('完整数据长度:', fullData.length)
  
  return fullData as Hex
}

/**
 * 简化的数据拼接函数 - 使用 viem 的 encodeFunctionData
 */
function buildSwapDataWithViem({
  router,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  callData,
}: {
  router: Hex
  fromToken: Hex
  toToken: Hex
  fromAmount: bigint
  toAmount: bigint
  callData: Hex
}): Hex {
  // 使用 viem 的 encodeFunctionData 来确保正确的编码
  return encodeFunctionData({
    abi: [{
      name: 'swap',
      type: 'function',
      inputs: [
        { name: 'router', type: 'address' },
        { name: 'fromToken', type: 'address' },
        { name: 'toToken', type: 'address' },
        { name: 'fromAmount', type: 'uint256' },
        { name: 'toAmount', type: 'uint256' },
        { name: 'callData', type: 'bytes' },
      ],
      outputs: [],
      stateMutability: 'payable',
    }],
    functionName: 'swap',
    args: [router, fromToken, toToken, fromAmount, toAmount, callData],
  })
}

/**
 * 调试函数 - 验证构造的交易数据
 */
export function debugSwapData(data: Hex) {
  console.log('=== 交易数据调试 ===')
  console.log('数据长度:', data.length)
  console.log('')
  
  const paramsData = data.slice(10)
  
  // 解析参数
  const router = '0x' + paramsData.slice(24, 64)
  const fromToken = '0x' + paramsData.slice(88, 128)
  const toToken = '0x' + paramsData.slice(152, 192)
  const fromAmount = BigInt('0x' + paramsData.slice(192, 256)).toString()
  const toAmount = BigInt('0x' + paramsData.slice(256, 320)).toString()
  const callDataOffset = parseInt(paramsData.slice(320, 384), 16)
  const callDataLength = parseInt(paramsData.slice(384, 448), 16)
  
  console.log('参数解析:')
  console.log('  router:', router)
  console.log('  fromToken:', fromToken)
  console.log('  toToken:', toToken)
  console.log('  fromAmount:', fromAmount, '(wei)')
  console.log('  toAmount:', toAmount, '(wei)')
  console.log('  callData 偏移量:', callDataOffset)
  console.log('  callData 长度:', callDataLength, '字节')
  
  // 解析 callData
  const callDataStart = 448
  const callData = paramsData.slice(callDataStart, callDataStart + callDataLength * 2)
  console.log('  callData 方法选择器:', callData.slice(0, 10))
  
  return {
    router,
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    callDataOffset,
    callDataLength,
    callDataMethodSelector: callData.slice(0, 10)
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

