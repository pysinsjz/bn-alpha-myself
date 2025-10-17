import { useState, useEffect, useCallback } from 'react'
import { 
  fetchAlphaTokensFromAPI, 
  sortTokensByVolume24h 
} from '@/lib/binance-api'
import { 
  saveTokenList, 
  loadTokenList, 
  clearTokenList,
  isTokenListValid,
  getTokenListRemainingTime,
  formatTokenListRemainingTime
} from '@/lib/token-storage'
import type { BinanceAlphaToken } from '@/types/alpha'

/**
 * Alpha 代币列表管理 Hook
 */
export function useAlphaTokens() {
  const [tokens, setTokens] = useState<BinanceAlphaToken[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const [remainingTime, setRemainingTime] = useState(0)

  /**
   * 从 API 获取代币列表
   */
  const fetchTokensFromAPI = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('正在从币安 API 获取 Alpha 代币列表...')
      const apiTokens = await fetchAlphaTokensFromAPI()
      
      // 按24小时交易额排序，取前100个
      const sortedTokens = sortTokensByVolume24h(apiTokens, 100)
      
      setTokens(sortedTokens)
      setLastUpdateTime(Date.now())
      
      // 保存到本地存储
      saveTokenList(sortedTokens)
      
      console.log(`成功获取 ${sortedTokens.length} 个 Alpha 代币`)
    } catch (err: any) {
      setError(err.message)
      console.error('获取 Alpha 代币列表失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 从本地存储加载代币列表
   */
  const loadTokensFromStorage = useCallback(() => {
    const storedTokens = loadTokenList()
    if (storedTokens) {
      setTokens(storedTokens)
      setLastUpdateTime(Date.now())
      console.log(`从本地存储加载了 ${storedTokens.length} 个代币`)
      return true
    }
    return false
  }, [])

  /**
   * 刷新代币列表
   */
  const refreshTokens = useCallback(() => {
    fetchTokensFromAPI()
  }, [fetchTokensFromAPI])

  /**
   * 清除代币列表
   */
  const clearTokens = useCallback(() => {
    setTokens([])
    setLastUpdateTime(0)
    clearTokenList()
  }, [])

  /**
   * 获取代币信息
   */
  const getTokenByAddress = useCallback((address: string): BinanceAlphaToken | undefined => {
    return tokens.find(token => 
      token.contractAddress.toLowerCase() === address.toLowerCase()
    )
  }, [tokens])

  const getTokenBySymbol = useCallback((symbol: string): BinanceAlphaToken | undefined => {
    return tokens.find(token => token.symbol === symbol)
  }, [tokens])

  const getTokenByAlphaId = useCallback((alphaId: string): BinanceAlphaToken | undefined => {
    return tokens.find(token => token.alphaId === alphaId)
  }, [tokens])

  // 页面加载时自动获取代币列表
  useEffect(() => {
    const initializeTokens = async () => {
      // 首先尝试从本地存储加载
      const loadedFromStorage = loadTokensFromStorage()
      
      // 如果本地存储中没有有效数据，则从 API 获取
      if (!loadedFromStorage) {
        await fetchTokensFromAPI()
      }
    }

    initializeTokens()
  }, [loadTokensFromStorage, fetchTokensFromAPI])

  // 定时更新剩余时间
  useEffect(() => {
    if (tokens.length === 0) {
      setRemainingTime(0)
      return
    }

    const updateRemainingTime = () => {
      const remaining = getTokenListRemainingTime()
      setRemainingTime(remaining)
      
      // 如果代币列表已过期，自动刷新
      if (remaining <= 0 && tokens.length > 0) {
        console.log('代币列表已过期，自动刷新')
        fetchTokensFromAPI()
      }
    }

    // 立即更新一次
    updateRemainingTime()

    // 每秒更新一次
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [tokens.length, fetchTokensFromAPI])

  return {
    // 状态
    tokens,
    isLoading,
    error,
    lastUpdateTime,
    remainingTime,
    remainingTimeFormatted: formatTokenListRemainingTime(remainingTime),
    isTokenListValid: isTokenListValid(),

    // 方法
    refreshTokens,
    clearTokens,
    getTokenByAddress,
    getTokenBySymbol,
    getTokenByAlphaId,
  }
}
