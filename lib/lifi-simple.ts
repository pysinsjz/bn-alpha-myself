import { getQuote } from '@lifi/sdk'
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
}: {
  fromToken: Hex
  toToken: Hex
  amount: string
  userAddress: Hex
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
    })

    const quoteRequest = {
      fromChain: BSC_CHAIN_ID,
      toChain: BSC_CHAIN_ID,
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: amount,
      fromAddress: userAddress,
      slippage: 0.005, // 0.5% 滑点
      order: 'CHEAPEST' as const,
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
 * 格式化金额为 wei
 */
export function formatAmountToWei(amount: string, decimals: number): string {
  const amountFloat = parseFloat(amount)
  const amountWei = Math.floor(amountFloat * Math.pow(10, decimals))
  return amountWei.toString()
}
