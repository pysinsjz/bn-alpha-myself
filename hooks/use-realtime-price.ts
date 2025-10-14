import { useEffect, useState } from 'react'
import type { BinanceAggTrade } from '@/types/alpha'
import { getAggTrades, getAlphaTokenByAddress } from '@/lib/binance-api'

interface RealtimePriceData {
  price: string | null
  priceChange24h: string | null
  volume24h: string | null
  recentTrades: BinanceAggTrade[]
  isLoading: boolean
  error: string | null
}

/**
 * 获取实时价格的 Hook
 * @param tokenAddress 代币合约地址
 * @param baseToken 基础代币符号（默认 USDC）
 * @param interval 更新间隔（毫秒，默认 1000）
 */
export function useRealtimePrice(
  tokenAddress: string | undefined,
  baseToken: string = 'USDC',
  interval: number = 1000,
): RealtimePriceData {
  const [price, setPrice] = useState<string | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<string | null>(null)
  const [volume24h, setVolume24h] = useState<string | null>(null)
  const [recentTrades, setRecentTrades] = useState<BinanceAggTrade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenAddress) {
      setPrice(null)
      setRecentTrades([])
      setError(null)
      return
    }

    // 获取 Alpha Token 信息
    const alphaToken = getAlphaTokenByAddress(tokenAddress)
    if (!alphaToken) {
      setError('未找到该代币信息')
      return
    }

    // 初始化时加载一次数据
    const fetchPrice = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 构建交易对符号
        const symbol = `${alphaToken.alphaId}${baseToken}`

        // 获取最近的交易数据
        const trades = await getAggTrades(symbol, { limit: 20 })

        if (trades.length > 0) {
          setPrice(trades[0].p)
          setRecentTrades(trades)

          // 从本地数据中获取 24h 变化和交易量
          setPriceChange24h(alphaToken.percentChange24h)
          setVolume24h(alphaToken.volume24h)
        }
        else {
          // 如果没有交易数据，使用本地缓存的价格
          setPrice(alphaToken.price)
          setPriceChange24h(alphaToken.percentChange24h)
          setVolume24h(alphaToken.volume24h)
          setRecentTrades([])
        }
      }
      catch (err) {
        console.error('获取实时价格失败:', err)
        setError(err instanceof Error ? err.message : '获取价格失败')
        // 失败时使用本地缓存的价格
        setPrice(alphaToken.price)
        setPriceChange24h(alphaToken.percentChange24h)
        setVolume24h(alphaToken.volume24h)
      }
      finally {
        setIsLoading(false)
      }
    }

    fetchPrice()

    // 设置定时器
    const timer = setInterval(fetchPrice, interval)

    return () => {
      clearInterval(timer)
    }
  }, [tokenAddress, baseToken, interval])

  return {
    price,
    priceChange24h,
    volume24h,
    recentTrades,
    isLoading,
    error,
  }
}

