import { useState, useCallback, useEffect } from 'react'
import { 
  BinanceAlphaTradingService, 
  createBinanceAlphaTradingService,
  extractAuthFromCurl,
  type PlaceOrderRequest,
  type QueryOrdersRequest,
  type OrderInfo,
  type PlaceOrderResponse,
  type QueryOrdersResponse,
  type CancelOrderResponse
} from '@/lib/binance-alpha-trading'
import { 
  saveAuthInfo, 
  loadAuthInfo, 
  clearAuthInfo, 
  isAuthValid, 
  getAuthRemainingTime,
  formatRemainingTime,
  extractAndSaveAuthFromCurl
} from '@/lib/auth-storage'
import type { BinanceAlphaToken } from '@/types/alpha'

/**
 * 币安 Alpha 交易 Hook
 */
export function useBinanceAlphaTrading() {
  const [tradingService, setTradingService] = useState<BinanceAlphaTradingService | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authRemainingTime, setAuthRemainingTime] = useState(0)

  // 认证状态
  const [csrfToken, setCsrfToken] = useState('')
  const [cookies, setCookies] = useState('')

  // 页面加载时自动读取存储的认证信息
  useEffect(() => {
    const loadStoredAuth = () => {
      const storedAuth = loadAuthInfo()
      if (storedAuth) {
        setCsrfToken(storedAuth.csrfToken)
        setCookies(storedAuth.cookies)
        
        const service = createBinanceAlphaTradingService(storedAuth.csrfToken, storedAuth.cookies)
        setTradingService(service)
        setIsAuthenticated(true)
        setError(null)
        
        console.log('已自动加载存储的认证信息')
      }
    }

    loadStoredAuth()
  }, [])

  // 定时更新认证剩余时间
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthRemainingTime(0)
      return
    }

    const updateRemainingTime = () => {
      const remaining = getAuthRemainingTime()
      setAuthRemainingTime(remaining)
      
      // 如果认证已过期，自动清除
      if (remaining <= 0) {
        handleClearAuth()
      }
    }

    // 立即更新一次
    updateRemainingTime()

    // 每秒更新一次
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  /**
   * 设置认证信息
   */
  const setAuth = useCallback((csrf: string, cookieString: string) => {
    setCsrfToken(csrf)
    setCookies(cookieString)
    
    const service = createBinanceAlphaTradingService(csrf, cookieString)
    setTradingService(service)
    setIsAuthenticated(true)
    setError(null)

    // 保存到本地存储
    saveAuthInfo({
      csrfToken: csrf,
      cookies: cookieString,
    })
  }, [])

  /**
   * 从 curl 请求设置认证信息
   */
  const setAuthFromCurl = useCallback((curlString: string) => {
    const result = extractAndSaveAuthFromCurl(curlString)
    if (result.success) {
      try {
        const { csrfToken: csrf, cookies: cookieString } = extractAuthFromCurl(curlString)
        setAuth(csrf, cookieString)
      } catch (err: any) {
        setError(`解析 curl 请求失败: ${err.message}`)
      }
    } else {
      setError(result.error || '设置认证信息失败')
    }
  }, [setAuth])

  /**
   * 清除认证信息
   */
  const handleClearAuth = useCallback(() => {
    setCsrfToken('')
    setCookies('')
    setTradingService(null)
    setIsAuthenticated(false)
    setError(null)
    setAuthRemainingTime(0)

    // 清除本地存储
    clearAuthInfo()
  }, [])

  // 为了保持向后兼容，保留原来的 clearAuth 方法
  const clearAuth = handleClearAuth

  /**
   * 挂买单
   */
  const placeBuyOrder = useCallback(async (params: {
    token: BinanceAlphaToken
    quoteAsset: string
    price: number
    quantity: number
    paymentAmount: number
    paymentType?: 'CARD' | 'BALANCE' | 'BANK'
  }): Promise<PlaceOrderResponse> => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.placeBuyOrder(params)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  /**
   * 挂卖单
   */
  const placeSellOrder = useCallback(async (params: {
    token: BinanceAlphaToken
    quoteAsset: string
    price: number
    quantity: number
  }): Promise<PlaceOrderResponse> => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.placeSellOrder(params)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  /**
   * 查询订单
   */
  const queryOrders = useCallback(async (params: QueryOrdersRequest = {}): Promise<QueryOrdersResponse> => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.queryOrders(params)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  /**
   * 取消订单
   */
  const cancelOrder = useCallback(async (orderId: string): Promise<CancelOrderResponse> => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.cancelOrder(orderId)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  /**
   * 获取订单详情
   */
  const getOrderDetail = useCallback(async (orderId: string): Promise<OrderInfo> => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.getOrderDetail(orderId)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  /**
   * 获取账户余额
   */
  const getAccountBalance = useCallback(async () => {
    if (!tradingService) {
      throw new Error('请先设置认证信息')
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await tradingService.getAccountBalance()
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tradingService])

  return {
    // 状态
    isAuthenticated,
    isLoading,
    error,
    csrfToken,
    cookies,
    authRemainingTime,
    authRemainingTimeFormatted: formatRemainingTime(authRemainingTime),

    // 认证方法
    setAuth,
    setAuthFromCurl,
    clearAuth,

    // 交易方法
    placeBuyOrder,
    placeSellOrder,
    queryOrders,
    cancelOrder,
    getOrderDetail,
    getAccountBalance,
  }
}

/**
 * 订单管理 Hook
 */
export function useOrderManagement() {
  const [orders, setOrders] = useState<OrderInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { queryOrders, cancelOrder, isAuthenticated } = useBinanceAlphaTrading()

  /**
   * 刷新订单列表
   */
  const refreshOrders = useCallback(async (params: QueryOrdersRequest = {}) => {
    if (!isAuthenticated) {
      setError('请先设置认证信息')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await queryOrders(params)
      setOrders(response.data.orders)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [queryOrders, isAuthenticated])

  /**
   * 取消订单
   */
  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!isAuthenticated) {
      setError('请先设置认证信息')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await cancelOrder(orderId)
      // 取消成功后刷新订单列表
      await refreshOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [cancelOrder, refreshOrders, isAuthenticated])

  /**
   * 根据状态过滤订单
   */
  const getOrdersByStatus = useCallback((status: string) => {
    return orders.filter(order => order.status === status)
  }, [orders])

  /**
   * 根据交易方向过滤订单
   */
  const getOrdersBySide = useCallback((side: 'BUY' | 'SELL') => {
    return orders.filter(order => order.workingSide === side)
  }, [orders])

  return {
    orders,
    isLoading,
    error,
    refreshOrders,
    handleCancelOrder,
    getOrdersByStatus,
    getOrdersBySide,
  }
}
