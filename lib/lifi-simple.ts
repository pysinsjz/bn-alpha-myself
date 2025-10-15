import { getQuote } from '@lifi/sdk'
import { parseUnits } from 'viem'
import type { Hex } from 'viem'

// BSC 链 ID
const BSC_CHAIN_ID = 56

/**
 * 简化的 LI.FI 报价获取
 * 用于测试和调试
 */
export async function getSimpleLifiQuote({
  fromToken,
  toToken,
  amount,
  userAddress,
  slippage = 0.5,
  allowExchanges = ['pancakeswap'],
  order = 'FASTEST',
}: {
  fromToken: Hex
  toToken: Hex
  amount: string
  userAddress: Hex
  slippage?: number
  allowExchanges?: string[]
  order?: 'CHEAPEST' | 'FASTEST' | 'SAFEST'
}): Promise<{
  to: Hex
  data: Hex
  value: string
} | null> {
  try {
    console.log('获取 LI.FI 报价:', {
      fromToken,
      toToken,
      amount,
      userAddress,
      slippage,
      allowExchanges,
      order,
    })

    const quoteRequest = {
      fromChain: BSC_CHAIN_ID,
      toChain: BSC_CHAIN_ID,
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: amount,
      fromAddress: userAddress,
      slippage:  0.5, // 将百分比转换为小数
      order: order,
      allowExchanges: allowExchanges,
      // 添加更多参数来控制方法选择
      maxPriceImpact: 0.5, // 最大价格影响 0.5%
      // 禁用跨链桥，强制使用同链交换
      bridges: { allow: [], deny: [] }, // 禁用所有跨链桥
    }

    const quote = await getQuote(quoteRequest)
    
    console.log('LI.FI 报价结果:', quote)

    // 从 quote 中提取交易数据
    if (quote && quote.transactionRequest) {
      return {
        to: quote.transactionRequest.to as Hex,
        data: quote.transactionRequest.data as Hex,
        value: quote.transactionRequest.value || '0',
      }
    }

    return null
  } catch (error) {
    console.error('获取 LI.FI 报价失败:', error)
    return null
  }
}

/**
 * 测试不同参数设置对方法选择的影响
 */
export async function testLifiParameterEffects({
  fromToken,
  toToken,
  amount,
  userAddress,
}: {
  fromToken: Hex
  toToken: Hex
  amount: string
  userAddress: Hex
}) {
  console.log('=== 测试 LI.FI 参数对方法选择的影响 ===')
  
  const testCases = [
    {
      name: '当前设置 (FASTEST + PancakeSwap)',
      params: {
        order: 'FASTEST' as const,
        allowExchanges: ['pancakeswap'],
        maxPriceImpact: 0.5,
      }
    },
    {
      name: 'CHEAPEST + PancakeSwap',
      params: {
        order: 'CHEAPEST' as const,
        allowExchanges: ['pancakeswap'],
        maxPriceImpact: 0.5,
      }
    },
    {
      name: 'FASTEST + 多个交易所',
      params: {
        order: 'FASTEST' as const,
        allowExchanges: ['pancakeswap', 'kyberswap', '1inch'],
        maxPriceImpact: 0.5,
      }
    },
    {
      name: 'CHEAPEST + 多个交易所',
      params: {
        order: 'CHEAPEST' as const,
        allowExchanges: ['pancakeswap', 'kyberswap', '1inch'],
        maxPriceImpact: 0.5,
      }
    },
    {
      name: '高价格影响容忍度',
      params: {
        order: 'CHEAPEST' as const,
        allowExchanges: ['pancakeswap'],
        maxPriceImpact: 2.0, // 2% 价格影响
      }
    },
    {
      name: '禁用跨链桥 + CHEAPEST',
      params: {
        order: 'CHEAPEST' as const,
        allowExchanges: ['pancakeswap', 'kyberswap'],
        maxPriceImpact: 0.5,
        bridges: { allow: [], deny: [] }, // 明确禁用跨链桥
      }
    }
  ]
  
  for (const testCase of testCases) {
    try {
      console.log(`\n--- 测试: ${testCase.name} ---`)
      
      const quoteRequest = {
        fromChain: BSC_CHAIN_ID,
        toChain: BSC_CHAIN_ID,
        fromToken: fromToken,
        toToken: toToken,
        fromAmount: amount,
        fromAddress: userAddress,
        slippage: 0.005, // 0.5%
        // 默认禁用跨链桥，强制使用同链交换
        bridges: { allow: [], deny: [] },
        ...testCase.params,
        // 如果测试案例中有 bridges 参数，使用测试案例的
        ...(testCase.params.bridges && { bridges: testCase.params.bridges }),
      }
      
      const quote = await getQuote(quoteRequest)
      
      if (quote && quote.transactionRequest && quote.transactionRequest.data) {
        const methodId = quote.transactionRequest.data.slice(0, 10)
        console.log('方法ID:', methodId)
        console.log('合约地址:', quote.transactionRequest.to)
        console.log('交易类型:', methodId === '0x5fd9ae2e' ? '多步骤交换' : '单步骤交换')
        console.log('步骤数量:', quote.includedSteps?.length || 0)
      } else {
        console.log('无报价结果')
      }
    } catch (error) {
      console.error(`测试失败: ${testCase.name}`, error)
    }
  }
}

/**
 * 格式化金额为 wei - 使用 viem 的 parseUnits 确保精度
 */
export function formatAmountToWei(amount: string, decimals: number): string {
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
