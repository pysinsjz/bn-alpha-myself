import type { BinanceAggTrade, BinanceAlphaToken, BinanceApiResponse } from '@/types/alpha'
import alphaTokens from '@/constants/tokens'

/**
 * 币安 Alpha API 基础 URL
 */
const BINANCE_API_BASE = 'https://www.binance.com/bapi/defi/v1/public/alpha-trade'

/**
 * 获取所有 Alpha Token 列表
 */
export function getAllAlphaTokens(): BinanceAlphaToken[] {
  // 将 tokens.ts 中的代币信息转换为 BinanceAlphaToken 格式
  return alphaTokens.map(token => ({
    tokenId: token.contractAddress.slice(-6), // 使用合约地址后6位作为 tokenId
    chainId: token.chainId,
    chainIconUrl: '',
    chainName: 'BSC',
    contractAddress: token.contractAddress,
    name: token.name,
    symbol: token.symbol,
    iconUrl: '',
    price: '0',
    percentChange24h: '0',
    volume24h: '0',
    marketCap: '0',
    fdv: '0',
    liquidity: '0',
    totalSupply: '0',
    circulatingSupply: '0',
    holders: '0',
    decimals: token.decimals,
    listingCex: false,
    hotTag: false,
    cexCoinName: token.symbol,
    canTransfer: true,
    denomination: token.decimals,
    offline: false,
    tradeDecimal: token.decimals,
    alphaId: `ALPHA_${token.contractAddress.slice(-6)}`,
    offsell: false,
    priceHigh24h: '0',
    priceLow24h: '0',
    onlineTge: false,
    onlineAirdrop: false,
  }))
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
  // if (params?.limit)
  //   url.searchParams.append('limit', params.limit.toString())

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

/**
 * 获取所有 Alpha 代币列表（从币安 API）
 */
export async function fetchAlphaTokensFromAPI(): Promise<BinanceAlphaToken[]> {
  try {
    const response = await fetch('https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list')
    
    if (!response.ok) {
      throw new Error(`获取 Alpha 代币列表失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.code !== '000000') {
      throw new Error(`获取 Alpha 代币列表失败: ${data.message || '未知错误'}`)
    }

    return data.data || []
  } catch (error) {
    console.error('获取 Alpha 代币列表失败:', error)
    throw error
  }
}

/**
 * 按24小时交易额排序 Alpha 代币
 * @param tokens Alpha 代币列表
 * @param limit 返回数量限制
 */
export function sortTokensByVolume24h(tokens: BinanceAlphaToken[], limit: number = 100): BinanceAlphaToken[] {
  return tokens
    .filter(token => {
      // 过滤掉离线的代币
      return !token.offline
    })
    .sort((a, b) => {
      const volumeA = parseFloat(a.volume24h || '0')
      const volumeB = parseFloat(b.volume24h || '0')
      return volumeB - volumeA // 降序排列
    })
    .slice(0, limit)
}

