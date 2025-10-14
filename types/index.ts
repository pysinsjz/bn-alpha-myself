import type { Hex } from 'viem'

export interface AlphaTokenInfo {
  chainId: string
  contractAddress: Hex
  name: string
  symbol: string
  decimals: number
  // tokenId: string
  // chainIconUrl: string
  // chainName: string
  // iconUrl: string
  // price: string
  // percentChange24h: string
  // volume24h: string
  // marketCap: string
  // fdv: string
  // liquidity: string
  // totalSupply: string
  // circulatingSupply: string
  // holders: string
  // listingCex: boolean
  // hotTag: boolean
  // cexCoinName: string
  // canTransfer: boolean
  // denomination: number
  // offline: boolean
  // tradeDecimal: number
  // alphaId: string
  // offsell: boolean
  // priceHigh24h: string
  // priceLow24h: string
  // onlineTge: boolean
  // onlineAirdrop: boolean
}

export interface NormalTransaction {
  blockNumber: string
  blockHash: Hex
  timeStamp: string
  hash: Hex
  nonce: string
  transactionIndex: string
  from: Hex
  to: Hex
  value: string
  gas: string
  gasPrice: string
  input: Hex
  methodId: Hex
  functionName: string
  contractAddress: string
  cumulativeGasUsed: string
  txreceipt_status: string
  gasUsed: string
  confirmations: string
  isError: string
}

export interface InternalTransaction {
  blockNumber: string
  timeStamp: string
  hash: Hex
  from: Hex
  to: Hex
  value: string
  contractAddress: Hex
  input: Hex
  type: string
  gas: string
  gasUsed: string
  traceId: string
  isError: string
  errCode: string
}

export interface TokenTransaction {
  blockNumber: string
  timeStamp: string
  hash: Hex
  nonce: string
  blockHash: Hex
  from: Hex
  contractAddress: Hex
  to: Hex
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  transactionIndex: string
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  input: Hex
  methodId: Hex
  functionName: string
  confirmations: string
}

export interface TransactionActionMap {
  txlist: NormalTransaction
  txlistinternal: InternalTransaction
  tokentx: TokenTransaction
}

export interface TransactionInfo {
  hash: Hex
  timestamp: number
  from: {
    address: Hex
    symbol: string
    decimals: number
    amount: number
    price: number
  }
  to: {
    address: Hex
    symbol: string
    decimals: number
    amount: number
    price: number
  }
  gas: number
  status: 'success' | 'failed'
}

export interface TokenInfo {
  address: Hex
  symbol: string
  decimals: number
  in: number
  out: number
  price: number
}

export interface Wallet {
  address: Hex
  label: string
  disabled?: boolean
}
