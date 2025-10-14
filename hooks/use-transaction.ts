import type { Hex } from 'viem'
import type { TokenInfo, TransactionInfo } from '@/types'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { zeroAddress } from 'viem'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { getTokenPrice } from '@/lib/api'
import { isAddressEqual } from '@/lib/utils'

interface TokenPriceCache {
  symbol: string
  price: number
  timestamp: number
}

const CACHE_EXPIRY = 5 * 60 * 1000 // 5min cache expiry

async function computeTokenSummaries(
  transactions: TransactionInfo[],
  tokenPriceCache: Record<string, TokenPriceCache>,
  setTokenPriceCache: (
    value: Record<string, TokenPriceCache> | ((val: Record<string, TokenPriceCache>) => Record<string, TokenPriceCache>)
  ) => void,
) {
  const tokenMap = new Map<Hex, TokenInfo>()
  const now = Date.now()
  const cacheUpdates: Record<string, TokenPriceCache> = {}

  const totalGas = transactions.reduce((sum, tx) => sum + tx.gas, 0)

  if (totalGas > 0) {
    const bnbToken = tokenMap.get(zeroAddress) || {
      address: zeroAddress,
      symbol: 'BNB',
      decimals: 18,
      in: 0,
      out: 0,
      price: 0,
    }
    bnbToken.out += totalGas
    tokenMap.set(zeroAddress, bnbToken)
  }

  for (const tx of transactions) {
    if (tx.status === 'success') {
      const fromAddress = tx.from.address.toLowerCase() as Hex
      const fromToken = tokenMap.get(fromAddress) || {
        address: tx.from.address,
        symbol: tx.from.symbol,
        decimals: tx.from.decimals,
        in: 0,
        out: 0,
        price: 0,
      }
      fromToken.out += tx.from.amount
      tokenMap.set(fromAddress, fromToken)

      const toAddress = tx.to.address.toLowerCase() as Hex
      const toToken = tokenMap.get(toAddress) || {
        address: tx.to.address,
        symbol: tx.to.symbol,
        decimals: tx.to.decimals,
        in: 0,
        out: 0,
        price: 0,
      }
      toToken.in += tx.to.amount
      tokenMap.set(toAddress, toToken)
    }
  }

  const pricePromises = Array.from(tokenMap.values()).map(async (token) => {
    const cacheKey = token.address.toLowerCase()
    const cached = tokenPriceCache[cacheKey]

    if (cached && now - cached.timestamp < CACHE_EXPIRY) {
      return { ...token, price: cached.price }
    }

    try {
      const price = await getTokenPrice({
        symbol: token.symbol,
        address: token.address,
      })
      cacheUpdates[cacheKey] = { symbol: token.symbol, price, timestamp: now }
      return { ...token, price }
    }
    catch (e) {
      console.error(`Failed to fetch price for ${token.symbol} (${token.address}):`, e)
      return {
        ...token,
        price: cached?.price,
      }
    }
  })

  const tokenSummaries = await Promise.all(pricePromises)

  if (Object.keys(cacheUpdates).length > 0) {
    setTokenPriceCache(prev => ({ ...prev, ...cacheUpdates }))
  }

  return tokenSummaries
}

export function useTransaction(address: Hex, startblock = 0, endblock = 99999999) {
  const [tokenPriceCache, setTokenPriceCache] = useLocalStorage<Record<string, TokenPriceCache>>('tokenPriceCache', {})
  return useQuery<{
    transactions: TransactionInfo[]
    tokens: TokenInfo[]
  }>({
    queryKey: ['transactions', address, startblock, endblock],
    queryFn: async () => {
      if (startblock === 0)
        return { transactions: [], tokens: [] }
      const { data: transactions } = await axios.get<TransactionInfo[]>('/api/transactions', {
        params: { address, startblock, endblock },
      })
      const tokens = await computeTokenSummaries(transactions, tokenPriceCache, setTokenPriceCache)
      const transactionsWithPrices = transactions.map((tx) => {
        const { price: fromTokenPrice }
          = tokens.find(t => isAddressEqual(t.address, tx.from.address)) || ({} as TokenInfo)
        const { price: toTokenPrice }
          = tokens.find(t => isAddressEqual(t.address, tx.to.address)) || ({} as TokenInfo)
        return {
          ...tx,
          from: {
            ...tx.from,
            price: fromTokenPrice,
          },
          to: {
            ...tx.to,
            price: toTokenPrice,
          },
        }
      })
      return {
        transactions: transactionsWithPrices,
        tokens,
      }
    },
    enabled: !!address && !Number.isNaN(startblock) && !Number.isNaN(endblock),
  })
}
