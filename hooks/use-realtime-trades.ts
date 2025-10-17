import { useState, useEffect, useCallback, useRef } from 'react'
import { getAggTrades } from '@/lib/binance-api'
import type { BinanceAggTrade } from '@/types/alpha'

/**
 * 实时成交数据 Hook
 */
export function useRealtimeTrades(
  symbol: string,
  enabled: boolean = true,
  interval: number = 1000, // 1秒
  limit: number = 20
) {
  const [trades, setTrades] = useState<BinanceAggTrade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  /**
   * 获取成交数据
   */
  const fetchTrades = useCallback(async () => {
    if (!enabled || !symbol || !isMountedRef.current) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const newTrades = await getAggTrades(symbol, { limit })
      
      if (isMountedRef.current) {
        setTrades(newTrades)
        setLastUpdateTime(Date.now())
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message)
        console.error('获取成交数据失败:', err)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [symbol, enabled, limit])

  /**
   * 开始实时更新
   */
  const startRealtimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // 立即获取一次数据
    fetchTrades()

    // 设置定时器
    intervalRef.current = setInterval(fetchTrades, interval)
  }, [fetchTrades, interval])

  /**
   * 停止实时更新
   */
  const stopRealtimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  /**
   * 手动刷新
   */
  const refresh = useCallback(() => {
    fetchTrades()
  }, [fetchTrades])

  // 组件挂载时开始更新
  useEffect(() => {
    isMountedRef.current = true
    
    if (enabled && symbol) {
      startRealtimeUpdates()
    }

    return () => {
      isMountedRef.current = false
      stopRealtimeUpdates()
    }
  }, [enabled, symbol, startRealtimeUpdates, stopRealtimeUpdates])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    trades,
    isLoading,
    error,
    lastUpdateTime,
    refresh,
    startRealtimeUpdates,
    stopRealtimeUpdates,
  }
}

/**
 * 成交数据统计 Hook
 */
export function useTradeStats(trades: BinanceAggTrade[]) {
  const [stats, setStats] = useState({
    totalVolume: 0,
    avgPrice: 0,
    priceChange: 0,
    buyCount: 0,
    sellCount: 0,
    buyVolume: 0,
    sellVolume: 0,
  })

  useEffect(() => {
    if (trades.length === 0) {
      setStats({
        totalVolume: 0,
        avgPrice: 0,
        priceChange: 0,
        buyCount: 0,
        sellCount: 0,
        buyVolume: 0,
        sellVolume: 0,
      })
      return
    }

    let totalVolume = 0
    let totalValue = 0
    let buyCount = 0
    let sellCount = 0
    let buyVolume = 0
    let sellVolume = 0

    trades.forEach(trade => {
      const price = parseFloat(trade.p)
      const quantity = parseFloat(trade.q)
      const value = price * quantity
      
      totalVolume += quantity
      totalValue += value

      // m = false 表示买方主动成交（买入），m = true 表示卖方主动成交（卖出）
      if (!trade.m) {
        buyCount++
        buyVolume += quantity
      } else {
        sellCount++
        sellVolume += quantity
      }
    })

    const avgPrice = totalVolume > 0 ? totalValue / totalVolume : 0
    const priceChange = trades.length > 1 
      ? parseFloat(trades[0].p) - parseFloat(trades[trades.length - 1].p)
      : 0

    setStats({
      totalVolume,
      avgPrice,
      priceChange,
      buyCount,
      sellCount,
      buyVolume,
      sellVolume,
    })
  }, [trades])

  return stats
}
