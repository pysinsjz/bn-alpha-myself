import { 
  getQuote, 
  getRoutes, 
  executeRoute, 
  getChains, 
  getTools,
  ChainType
} from '@lifi/sdk'
import { parseUnits } from 'viem'
import type { Hex } from 'viem'

// BSC 链 ID
const BSC_CHAIN_ID = 56

/**
 * LI.FI 报价接口
 */
export interface LifiQuote {
  quote: any
  estimatedGas: string
  priceImpact: string
}

/**
 * LI.FI 路由接口
 */
export interface LifiRoute {
  route: any
  estimatedGas: string
  priceImpact: string
}

/**
 * 获取 LI.FI 报价
 * 使用 getQuote API
 */
export async function getLifiQuote({
  fromToken,
  toToken,
  amount,
  slippage = 0.5,
  userAddress,
}: {
  fromToken: Hex
  toToken: Hex
  amount: string
  slippage?: number
  userAddress: Hex
}): Promise<LifiQuote | null> {
  try {
    const quoteRequest = {
      fromChain: BSC_CHAIN_ID,
      toChain: BSC_CHAIN_ID,
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: amount,
      fromAddress: userAddress,
      slippage: slippage / 100, // 转换为小数
      order: 'CHEAPEST' as const, // 选择最便宜的路由
      // 禁用跨链桥，强制使用同链交换
      bridges: { allow: [], deny: [] },
    }

    const quote = await getQuote(quoteRequest)
    
    return {
      quote,
      estimatedGas: quote.estimate?.gasCosts?.[0]?.amount || '0',
      priceImpact: '0', // LI.FI 可能没有直接的 priceImpact 字段
    }
  } catch (error) {
    console.error('获取 LI.FI 报价失败:', error)
    return null
  }
}

/**
 * 获取 LI.FI 路由
 * 使用 getRoutes API
 */
export async function getLifiRoutes({
  fromToken,
  toToken,
  amount,
  slippage = 0.5,
  userAddress,
  allowExchanges = ['pancakeswap'],
  order = 'CHEAPEST',
}: {
  fromToken: Hex
  toToken: Hex
  amount: string
  slippage?: number
  userAddress: Hex
  allowExchanges?: string[]
  order?: 'CHEAPEST' | 'FASTEST' | 'SAFEST'
}): Promise<LifiRoute[] | null> {
  try {
    const routeRequest = {
      fromChainId: BSC_CHAIN_ID,
      toChainId: BSC_CHAIN_ID,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      fromAmount: amount,
      fromAddress: userAddress,
      slippage: slippage / 100,
      order: order,
      allowExchanges: allowExchanges,
      maxPriceImpact: 0.5, // 最大价格影响 0.5%
      // 禁用跨链桥，强制使用同链交换
      bridges: { allow: [], deny: [] },
    }

    const routes = await getRoutes(routeRequest)
    
    return routes.routes.map((route: any) => ({
      route,
      estimatedGas: route.estimate?.gasCosts?.[0]?.amount || '0',
      priceImpact: '0', // LI.FI 可能没有直接的 priceImpact 字段
    }))
  } catch (error) {
    console.error('获取 LI.FI 路由失败:', error)
    return null
  }
}

/**
 * 执行 LI.FI 路由
 * 使用 executeRoute API
 */
export async function executeLifiRoute({
  route,
  userAddress,
}: {
  route: any
  userAddress: Hex
}): Promise<{
  transactionRequest: {
    to: Hex
    data: Hex
    value: string
    gas?: string
  }
} | null> {
  try {
    // 注意：这里我们需要模拟执行来获取交易数据
    // 实际使用时可能需要调整
    const transactionRequest = {
      to: route.transactionRequest?.to as Hex || '0x' as Hex,
      data: route.transactionRequest?.data as Hex || '0x' as Hex,
      value: route.transactionRequest?.value || '0',
      gas: route.transactionRequest?.gasLimit,
    }

    return { transactionRequest }
  } catch (error) {
    console.error('执行 LI.FI 路由失败:', error)
    return null
  }
}

/**
 * 获取支持的链
 */
export async function getSupportedChains(): Promise<any[]> {
  try {
    const chains = await getChains({ chainTypes: [ChainType.EVM] })
    return chains
  } catch (error) {
    console.error('获取支持的链失败:', error)
    return []
  }
}

/**
 * 获取可用的工具（DEX 和桥接器）
 */
export async function getAvailableTools(): Promise<any | null> {
  try {
    const tools = await getTools()
    return tools
  } catch (error) {
    console.error('获取可用工具失败:', error)
    return null
  }
}

/**
 * 格式化金额为 LI.FI API 格式
 */
export function formatAmountForLifi(amount: string, decimals: number): string {
  try {
    // 使用 viem 的 parseUnits 来正确处理精度
    const amountWei = parseUnits(amount, decimals)
    return amountWei.toString()
  } catch (error) {
    console.error('格式化金额失败:', error)
    // 如果 parseUnits 失败，回退到原来的方法
    const amountFloat = parseFloat(amount)
    const amountWei = Math.floor(amountFloat * Math.pow(10, decimals))
    return amountWei.toString()
  }
}

/**
 * 检查代币是否为原生代币
 */
export function isNativeToken(tokenAddress: Hex): boolean {
  return tokenAddress === '0x0000000000000000000000000000000000000000' || 
         tokenAddress === '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' // WBNB
}

/**
 * 获取原生代币地址
 */
export function getNativeTokenAddress(): Hex {
  return '0x0000000000000000000000000000000000000000' as Hex
}

/**
 * 获取 WBNB 地址
 */
export function getWBNBAddress(): Hex {
  return '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' as Hex
}
