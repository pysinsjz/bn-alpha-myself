import type { BinanceAggTrade, BinanceAlphaToken, BinanceApiResponse } from '@/types/alpha'
import alphaTokensData from '@/constants/alpha_token.json'

/**
 * 币安 Alpha API 基础 URL
 */
const BINANCE_API_BASE = 'https://www.binance.com/bapi/defi/v1/public/alpha-trade'

/**
 * 获取所有 Alpha Token 列表
 */
export function getAllAlphaTokens(): BinanceAlphaToken[] {
  const response = alphaTokensData as BinanceApiResponse<BinanceAlphaToken[]>
  return response.data || []
}

/**
 * 根据合约地址获取 Alpha Token 信息
 */
export function getAlphaTokenByAddress(address: string): BinanceAlphaToken | undefined {
  const tokens = getAllAlphaTokens()
  return tokens.find(token =>
    token.contractAddress.toLowerCase() === address.toLowerCase(),
  )
}

/**
 * 根据 symbol 获取 Alpha Token 信息
 */
export function getAlphaTokenBySymbol(symbol: string): BinanceAlphaToken | undefined {
  const tokens = getAllAlphaTokens()
  return tokens.find(token => token.symbol === symbol)
}

/**
 * 获取聚合交易数据
 * @param symbol 交易对符号，格式：ALPHA_118USDC（使用 alphaId）
 * @param params 查询参数
 */
export async function getAggTrades(
  symbol: string,
  params?: {
    fromId?: number
    startTime?: number
    endTime?: number
    limit?: number
  },
): Promise<BinanceAggTrade[]> {
  const url = new URL(`${BINANCE_API_BASE}/agg-trades`)
  url.searchParams.append('symbol', symbol)

  if (params?.fromId)
    url.searchParams.append('fromId', params.fromId.toString())
  if (params?.startTime)
    url.searchParams.append('startTime', params.startTime.toString())
  if (params?.endTime)
    url.searchParams.append('endTime', params.endTime.toString())
  if (params?.limit)
    url.searchParams.append('limit', params.limit.toString())

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`获取聚合交易数据失败: ${response.statusText}`)
    }

    const data = await response.json()

    // 币安 API 可能返回两种格式
    // 1. 直接返回数组
    // 2. 返回 { code, message, data } 结构
    if (Array.isArray(data)) {
      return data
    }
    else if (data.code === '000000' && Array.isArray(data.data)) {
      return data.data
    }
    else {
      console.error('Unexpected API response:', data)
      return []
    }
  }
  catch (error) {
    console.error('获取聚合交易数据失败:', error)
    return []
  }
}

/**
 * 获取最新价格
 * @param symbol 交易对符号
 */
export async function getLatestPrice(symbol: string): Promise<string | null> {
  const trades = await getAggTrades(symbol, { limit: 1 })
  if (trades.length > 0) {
    return trades[0].p
  }
  return null
}

/**
 * 构建交易对符号
 * @param alphaId Alpha 代币 ID（如 ALPHA_118）
 * @param baseToken 基础代币符号（如 USDC）
 */
export function buildTradingPair(alphaId: string, baseToken: string = 'USDC'): string {
  return `${alphaId}${baseToken}`
}

