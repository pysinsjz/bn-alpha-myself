import type { Hex } from 'viem'

/**
 * 解析交易数据中的方法签名
 */
export function parseTransactionMethod(data: Hex) {
  const methodId = data.slice(0, 10)
  
  // 已知的方法签名映射
  const methodSignatures: Record<string, string> = {
    '0x5fd9ae2e': 'swapTokensMultipleV3ERC20ToERC20 (LI.FI 多步骤交换)',
    '0x4666fc80': 'swapTokensSingleV3ERC20ToERC20 (KyberSwap)',
    '0x810c705b': 'swap (Binance DEX Router)',
    '0x25356bc7': 'proxySwapV2 (Binance DEX Router)',
    '0x38ed1739': 'swapExactTokensForTokens (PancakeSwap V2)',
    '0x7ff36ab5': 'swapExactETHForTokens (PancakeSwap V2)',
    '0x18cbafe5': 'swapExactTokensForETH (PancakeSwap V2)',
    '0x8803dbee': 'swapTokensForExactTokens (PancakeSwap V2)',
    '0x4a25d94a': 'swapTokensForExactETH (PancakeSwap V2)',
    '0xfb3bdb41': 'swapETHForExactTokens (PancakeSwap V2)',
  }
  
  return {
    methodId,
    description: methodSignatures[methodId] || '未知方法',
    isKnown: methodId in methodSignatures
  }
}

/**
 * 分析 LI.FI 和链上真实数据的差异
 */
export function analyzeTransactionDifference(lifiData: Hex, chainData: Hex) {
  const lifiMethod = parseTransactionMethod(lifiData)
  const chainMethod = parseTransactionMethod(chainData)
  
  return {
    lifi: {
      methodId: lifiMethod.methodId,
      description: lifiMethod.description,
      isKnown: lifiMethod.isKnown
    },
    chain: {
      methodId: chainMethod.methodId,
      description: chainMethod.description,
      isKnown: chainMethod.isKnown
    },
    isDifferent: lifiMethod.methodId !== chainMethod.methodId,
    reason: lifiMethod.methodId !== chainMethod.methodId 
      ? 'LI.FI 使用包装方法，链上使用直接方法' 
      : '方法签名一致'
  }
}

/**
 * 提取合约地址
 */
export function extractContractAddress(to: Hex): string {
  return to
}

/**
 * 分析交易类型
 */
export function analyzeTransactionType(data: Hex, to: Hex) {
  const method = parseTransactionMethod(data)
  const contractAddress = extractContractAddress(to)
  
  // 已知的合约地址映射
  const contractAddresses: Record<string, string> = {
    '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae': 'LI.FI 路由器',
    '0x6131b5fae19ea4f9d964eac0408e4408b66337b5': 'KyberSwap 路由器',
    '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap V2 路由器',
    '0xce57c3984a549f28b5173ebae96d3e662f3760a7': 'Binance DEX 路由器',
  }
  
  return {
    method: method,
    contract: {
      address: contractAddress,
      description: contractAddresses[contractAddress.toLowerCase()] || '未知合约'
    },
    transactionType: method.isKnown ? '已知方法' : '未知方法'
  }
}

/**
 * 分析 LI.FI 和直接调用的差异
 */
export function analyzeLifiVsDirectCall() {
  return {
    lifi: {
      methodId: '0x5fd9ae2e',
      methodName: 'swapTokensMultipleV3ERC20ToERC20',
      contract: '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae',
      description: 'LI.FI 路由器 - 多步骤交换',
      explanation: 'LI.FI 使用包装方法，内部可能调用多个 DEX'
    },
    direct: {
      methodId: '0x4666fc80',
      methodName: 'swapTokensSingleV3ERC20ToERC20',
      contract: '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
      description: 'KyberSwap 路由器 - 单步交换',
      explanation: '直接调用 KyberSwap 合约'
    },
    difference: {
      reason: 'LI.FI 作为聚合器，使用包装方法来统一不同 DEX 的接口',
      impact: '用户看到的是 LI.FI 的方法名，但实际执行的是底层 DEX 的方法',
      benefit: '简化用户交互，自动选择最优路由'
    }
  }
}

/**
 * 调试交易数据
 */
export function debugTransactionData(transactionData: {
  to: Hex
  data: Hex
  value?: string
}) {
  const analysis = analyzeTransactionType(transactionData.data, transactionData.to)
  
  console.log('=== 交易数据分析 ===')
  console.log('合约地址:', analysis.contract.address)
  console.log('合约描述:', analysis.contract.description)
  console.log('方法ID:', analysis.method.methodId)
  console.log('方法描述:', analysis.method.description)
  console.log('交易类型:', analysis.transactionType)
  console.log('Value:', transactionData.value || '0x0')
  
  // 如果是 LI.FI 方法，显示差异分析
  if (analysis.method.methodId === '0x5fd9ae2e') {
    console.log('\n=== LI.FI vs 直接调用差异分析 ===')
    const diffAnalysis = analyzeLifiVsDirectCall()
    console.log('LI.FI 方法:', diffAnalysis.lifi.methodName)
    console.log('直接调用方法:', diffAnalysis.direct.methodName)
    console.log('差异原因:', diffAnalysis.difference.reason)
    console.log('影响:', diffAnalysis.difference.impact)
    console.log('优势:', diffAnalysis.difference.benefit)
  }
  
  return analysis
}
