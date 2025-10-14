import type { Hex } from 'viem'

/**
 * 币安 Alpha Token 完整信息
 */
export interface BinanceAlphaToken {
  tokenId: string
  chainId: string
  chainIconUrl: string
  chainName: string
  contractAddress: Hex
  name: string
  symbol: string
  iconUrl: string
  price: string
  percentChange24h: string
  volume24h: string
  marketCap: string
  fdv: string
  liquidity: string
  totalSupply: string
  circulatingSupply: string
  holders: string
  decimals: number
  listingCex: boolean
  hotTag: boolean
  cexCoinName: string
  canTransfer: boolean
  denomination: number
  offline: boolean
  tradeDecimal: number
  alphaId: string
  offsell: boolean
  priceHigh24h: string
  priceLow24h: string
  count24h?: string
  onlineTge: boolean
  onlineAirdrop: boolean
  score?: number
  cexOffDisplay?: boolean
  stockState?: boolean
  listingTime?: number
  mulPoint?: number
  bnExclusiveState?: boolean
}

/**
 * 币安 Alpha 聚合交易数据
 */
export interface BinanceAggTrade {
  a: number // 聚合成交ID
  p: string // 价格
  q: string // 数量
  f: number // 首笔成交ID
  l: number // 末笔成交ID
  T: number // 时间戳
  m: boolean // 买方是否是做市商（已废弃）
}

/**
 * 币安 API 响应结构
 */
export interface BinanceApiResponse<T> {
  code: string
  message: string | null
  messageDetail: string | null
  data: T
}

