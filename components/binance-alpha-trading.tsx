'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/custom-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  X,
  RefreshCw,
  Wallet,
  Settings
} from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { useBinanceAlphaTrading, useOrderManagement } from '@/hooks/use-binance-alpha-trading'
import { useRealtimeTrades, useTradeStats } from '@/hooks/use-realtime-trades'
import { useAlphaTokens } from '@/hooks/use-alpha-tokens'
import type { BinanceAlphaToken } from '@/types/alpha'
import dayjs from '@/lib/dayjs'

export default function BinanceAlphaTrading() {
  const {
    isAuthenticated,
    isLoading,
    error,
    authRemainingTime,
    authRemainingTimeFormatted,
    setAuthFromCurl,
    clearAuth,
    placeBuyOrder,
    placeSellOrder,
    getAccountBalance,
    tradingService,
  } = useBinanceAlphaTrading()

  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    refreshOrders,
    handleCancelOrder,
    getOrdersByStatus,
    getOrdersBySide,
  } = useOrderManagement(tradingService, isAuthenticated)

  // Alpha 代币列表
  const {
    tokens: alphaTokensList,
    isLoading: tokensLoading,
    error: tokensError,
    lastUpdateTime: tokensLastUpdate,
    remainingTime: tokensRemainingTime,
    remainingTimeFormatted: tokensRemainingTimeFormatted,
    refreshTokens,
    getTokenByAddress,
  } = useAlphaTokens()

  // 认证相关状态
  const [curlInput, setCurlInput] = useState('')
  const [showAuthForm, setShowAuthForm] = useState(false)

  // 交易相关状态
  const [selectedToken, setSelectedToken] = useState<BinanceAlphaToken | null>(null)
  const [quoteAsset, setQuoteAsset] = useState('USDT')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentType, setPaymentType] = useState<'CARD' | 'BALANCE' | 'BANK'>('BALANCE')

  // 账户余额
  const [accountBalance, setAccountBalance] = useState<any>(null)

  // 实时成交数据
  // 将更新频率从 1 秒改为 3 秒，减少 API 调用频率和内存占用
  const tradingPair = selectedToken ? `${selectedToken.alphaId}${quoteAsset}` : ''
  const {
    trades: realtimeTrades,
    isLoading: tradesLoading,
    error: tradesError,
    lastUpdateTime,
    refresh: refreshTrades,
  } = useRealtimeTrades(tradingPair, isAuthenticated && !!selectedToken, 3000, 20)

  // 成交数据统计
  const tradeStats = useTradeStats(realtimeTrades)

  /**
   * 点击成交价格设置挂单价格
   */
  const handlePriceClick = useCallback((price: string) => {
    setOrderPrice(price)
    toast.success(`已设置挂单价格为 ${price}`)
  }, [])

  /**
   * 自动计算挂单数量（仅当支付金额改变时）
   */
  useEffect(() => {
    if (paymentAmount && orderPrice && Number(paymentAmount) > 0 && Number(orderPrice) > 0) {
      const quantity = Number(paymentAmount) / Number(orderPrice)
      const newQuantity = quantity.toFixed(6)
      // 避免不必要的更新
      if (orderQuantity !== newQuantity) {
        setOrderQuantity(newQuantity)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentAmount, orderPrice])

  /**
   * 自动计算支付金额（当挂单数量和价格变化时）
   */
  useEffect(() => {
    if (orderQuantity && orderPrice && Number(orderQuantity) > 0 && Number(orderPrice) > 0) {
      const amount = Number(orderQuantity) * Number(orderPrice)
      const newAmount = amount.toFixed(6)
      // 避免不必要的更新
      if (paymentAmount !== newAmount) {
        setPaymentAmount(newAmount)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderQuantity, orderPrice])

  // 初始化时设置默认代币（仅在代币列表首次加载时）
  useEffect(() => {
    if (alphaTokensList.length > 0 && !selectedToken) {
      setSelectedToken(alphaTokensList[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alphaTokensList.length])

  // 当认证状态改变时，获取账户余额
  useEffect(() => {
    if (isAuthenticated) {
      handleGetAccountBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  /**
   * 处理认证
   */
  const handleAuth = () => {
    if (!curlInput.trim()) {
      toast.error('请输入 curl 请求')
      return
    }

    try {
      setAuthFromCurl(curlInput)
      toast.success('认证成功')
      setShowAuthForm(false)
    } catch (err: any) {
      toast.error(`认证失败: ${err.message}`)
    }
  }

  /**
   * 获取账户余额
   */
  const handleGetAccountBalance = async () => {
    try {
      const balance = await getAccountBalance()
      setAccountBalance(balance)
    } catch (err: any) {
      console.error('获取账户余额失败:', err)
    }
  }

  /**
   * 挂买单
   */
  const handlePlaceBuyOrder = async () => {
    if (!selectedToken) {
      toast.error('请选择代币')
      return
    }

    if (!orderPrice || !orderQuantity || !paymentAmount) {
      toast.error('请填写完整的订单信息')
      return
    }

    try {
      const result = await placeBuyOrder({
        token: selectedToken,
        quoteAsset,
        price: Number(orderPrice),
        quantity: Number(orderQuantity),
        paymentAmount: Number(paymentAmount),
        paymentType,
      })

      toast.success('买单已提交')
      console.log('买单结果:', result)
      
      // 清空表单
      setOrderPrice('')
      setOrderQuantity('')
      setPaymentAmount('')
      
      // 刷新订单列表
      refreshOrders()
    } catch (err: any) {
      toast.error(`下单失败: ${err.message}`)
    }
  }

  /**
   * 挂卖单
   */
  const handlePlaceSellOrder = async () => {
    if (!selectedToken) {
      toast.error('请选择代币')
      return
    }

    if (!orderPrice || !orderQuantity) {
      toast.error('请填写完整的订单信息')
      return
    }

    try {
      const result = await placeSellOrder({
        token: selectedToken,
        quoteAsset,
        price: Number(orderPrice),
        quantity: Number(orderQuantity),
      })

      toast.success('卖单已提交')
      console.log('卖单结果:', result)
      
      // 清空表单
      setOrderPrice('')
      setOrderQuantity('')
      
      // 刷新订单列表
      refreshOrders()
    } catch (err: any) {
      toast.error(`下单失败: ${err.message}`)
    }
  }

  /**
   * 取消订单
   */
  const handleCancel = async (orderId: string) => {
    try {
      await handleCancelOrder(orderId)
      toast.success('订单已取消')
    } catch (err: any) {
      toast.error(`取消订单失败: ${err.message}`)
    }
  }

  /**
   * 刷新订单列表
   */
  const handleRefreshOrders = () => {
    refreshOrders()
  }

  // 获取不同状态的订单
  const pendingOrders = getOrdersByStatus('PENDING')
  const filledOrders = getOrdersByStatus('FILLED')
  const cancelledOrders = getOrdersByStatus('CANCELLED')
  const buyOrders = getOrdersBySide('BUY')
  const sellOrders = getOrdersBySide('SELL')

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 认证状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            币安 Alpha 交易认证
          </CardTitle>
          <CardDescription>
            使用币安 Alpha 交易接口进行挂单交易
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>需要认证</AlertTitle>
                <AlertDescription>
                  请提供币安 Alpha 交易的认证信息。你可以从浏览器开发者工具中复制 curl 请求。
                  <br />
                  <span className="text-xs text-muted-foreground mt-1 block">
                    💾 认证信息将自动保存到本地，刷新页面后无需重新认证（有效期24小时）
                  </span>
                </AlertDescription>
              </Alert>

              {!showAuthForm ? (
                <Button onClick={() => setShowAuthForm(true)}>
                  设置认证信息
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Curl 请求</label>
                    <textarea
                      className="w-full mt-1 p-3 border rounded-lg font-mono text-xs"
                      rows={8}
                      placeholder="请粘贴完整的 curl 请求..."
                      value={curlInput}
                      onChange={(e) => setCurlInput(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAuth} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          认证中...
                        </>
                      ) : (
                        '确认认证'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAuthForm(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">已认证</span>
                </div>
                <Button variant="outline" onClick={clearAuth}>
                  清除认证
                </Button>
              </div>
              
              {/* 认证剩余时间 */}
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    认证有效期
                  </span>
                  <span className={`text-sm font-mono ${
                    authRemainingTime > 60 * 60 * 1000 
                      ? 'text-green-600 dark:text-green-400' 
                      : authRemainingTime > 10 * 60 * 1000
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {authRemainingTimeFormatted}
                  </span>
                </div>
                {authRemainingTime <= 10 * 60 * 1000 && authRemainingTime > 0 && (
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    ⚠️ 认证即将过期，请及时更新
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 代币列表状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Alpha 代币列表
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tokensLastUpdate ? dayjs(tokensLastUpdate).format('HH:mm:ss') : '--:--:--'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTokens}
                disabled={tokensLoading}
              >
                {tokensLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            按24小时交易额排序的前100个 Alpha 代币
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokensError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>获取代币列表失败</AlertTitle>
              <AlertDescription>{tokensError}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  代币数量: {alphaTokensList.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  缓存剩余: {tokensRemainingTimeFormatted}
                </span>
              </div>
              
              {tokensLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">正在获取代币列表...</div>
                </div>
              ) : alphaTokensList.length > 0 ? (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">前5个代币（按24h交易额排序）:</div>
                  <div className="space-y-1">
                    {alphaTokensList.slice(0, 5).map((token, index) => (
                      <div key={token.alphaId} className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {index + 1}. {token.symbol} - {token.name}
                        </span>
                        <span className="text-muted-foreground">
                          ${Number(token.volume24h).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  暂无代币数据
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAuthenticated && (
        <>
          {/* 账户余额 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                账户余额
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>账户信息</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetAccountBalance}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {accountBalance && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(accountBalance, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 实时成交数据 */}
          {selectedToken && isAuthenticated && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>实时成交数据 - {selectedToken.symbol}/{quoteAsset}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {lastUpdateTime ? dayjs(lastUpdateTime).format('HH:mm:ss') : '--:--:--'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshTrades}
                      disabled={tradesLoading}
                    >
                      {tradesLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  点击成交价格可自动设置挂单价格
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tradesError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>获取成交数据失败</AlertTitle>
                    <AlertDescription>{tradesError}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* 统计信息 */}
                    {tradeStats.totalVolume > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted rounded-lg">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">总成交量</div>
                          <div className="font-medium">{tradeStats.totalVolume.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">平均价格</div>
                          <div className="font-medium">${tradeStats.avgPrice.toFixed(6)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">买入/卖出</div>
                          <div className="font-medium">{tradeStats.buyCount}/{tradeStats.sellCount}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">价格变化</div>
                          <div className={`font-medium ${tradeStats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tradeStats.priceChange >= 0 ? '+' : ''}{tradeStats.priceChange.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 成交记录 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">最近成交 (前20条)</label>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            买入
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            卖出
                          </span>
                        </div>
                      </div>
                      <ScrollArea className="h-48 w-full border rounded-lg">
                        <div className="p-2 space-y-1">
                          {realtimeTrades.length > 0 ? (
                            realtimeTrades.map((trade, index) => {
                              const isBuy = !trade.m
                              return (
                                <div
                                  key={`${trade.a}-${index}`}
                                  className="flex items-center justify-between text-xs py-1 hover:bg-muted/50 rounded px-2"
                                >
                                  <span className="text-muted-foreground w-16">
                                    {dayjs(trade.T).format('HH:mm:ss')}
                                  </span>
                                  <button
                                    onClick={() => handlePriceClick(trade.p)}
                                    className={`font-medium w-28 text-right hover:bg-muted rounded px-1 ${
                                      isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}
                                    title="点击设置挂单价格"
                                  >
                                    ${Number(trade.p).toFixed(8)}
                                  </button>
                                  <span className="text-muted-foreground w-20 text-right">
                                    {Number(trade.q).toFixed(2)}
                                  </span>
                                  <span
                                    className={`w-8 text-xs font-medium ${
                                      isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}
                                  >
                                    {isBuy ? '买' : '卖'}
                                  </span>
                                </div>
                              )
                            })
                          ) : tradesLoading ? (
                            <div className="text-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                              <div className="text-xs text-muted-foreground">加载成交数据中...</div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              暂无成交数据
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 交易面板 */}
          <Card>
            <CardHeader>
              <CardTitle>Alpha 代币交易</CardTitle>
              <CardDescription>挂买单或卖单</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buy" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="buy" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    挂买单
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    挂卖单
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="buy" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">选择代币</label>
                      <Select
                        value={selectedToken?.contractAddress || ''}
                        onValueChange={(value) => {
                          const token = alphaTokensList.find(t => t.contractAddress === value)
                          setSelectedToken(token || null)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择 Alpha 代币" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {alphaTokensList.map(token => (
                            <SelectItem key={token.contractAddress} value={token.contractAddress}>
                              <div className="flex items-center justify-between w-full">
                                <span>{token.symbol} - {token.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ${Number(token.volume24h).toLocaleString()}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">基础代币</label>
                      <Select value={quoteAsset} onValueChange={setQuoteAsset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USDT">USDT</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="BNB">BNB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">挂单价格 ({quoteAsset})</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        step="0.000001"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">挂单数量</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        step="0.000001"
                      />
                      <div className="text-xs text-muted-foreground">
                        根据支付金额和价格自动计算
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">支付金额 ({quoteAsset})</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        step="0.000001"
                      />
                      <div className="text-xs text-muted-foreground">
                        设置后自动计算挂单数量
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">支付方式</label>
                      <Select value={paymentType} onValueChange={(value: any) => setPaymentType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BALANCE">余额支付</SelectItem>
                          <SelectItem value="CARD">银行卡</SelectItem>
                          <SelectItem value="BANK">银行转账</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceBuyOrder}
                    disabled={isLoading || !selectedToken || !orderPrice || !orderQuantity || !paymentAmount}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        提交买单中...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        挂买单
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="sell" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">选择代币</label>
                      <Select
                        value={selectedToken?.contractAddress || ''}
                        onValueChange={(value) => {
                          const token = alphaTokensList.find(t => t.contractAddress === value)
                          setSelectedToken(token || null)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择 Alpha 代币" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {alphaTokensList.map(token => (
                            <SelectItem key={token.contractAddress} value={token.contractAddress}>
                              <div className="flex items-center justify-between w-full">
                                <span>{token.symbol} - {token.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ${Number(token.volume24h).toLocaleString()}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">基础代币</label>
                      <Select value={quoteAsset} onValueChange={setQuoteAsset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USDT">USDT</SelectItem>
                          <SelectItem value="USDC">USDC</SelectItem>
                          <SelectItem value="BNB">BNB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">挂单价格 ({quoteAsset})</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        step="0.000001"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">挂单数量</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        step="0.000001"
                      />
                      <div className="text-xs text-muted-foreground">
                        出售的代币数量
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceSellOrder}
                    disabled={isLoading || !selectedToken || !orderPrice || !orderQuantity}
                    className="w-full"
                    size="lg"
                    variant="destructive"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        提交卖单中...
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 mr-2" />
                        挂卖单
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 订单管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>订单管理</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshOrders}
                  disabled={ordersLoading}
                >
                  {ordersLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </CardTitle>
              <CardDescription>查看和管理你的订单</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误</AlertTitle>
                  <AlertDescription>{ordersError}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">全部订单 ({orders.length})</TabsTrigger>
                  <TabsTrigger value="pending">待成交 ({pendingOrders.length})</TabsTrigger>
                  <TabsTrigger value="filled">已成交 ({filledOrders.length})</TabsTrigger>
                  <TabsTrigger value="cancelled">已取消 ({cancelledOrders.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <OrderList orders={orders} onCancel={handleCancel} />
                </TabsContent>

                <TabsContent value="pending">
                  <OrderList orders={pendingOrders} onCancel={handleCancel} />
                </TabsContent>

                <TabsContent value="filled">
                  <OrderList orders={filledOrders} onCancel={handleCancel} showCancel={false} />
                </TabsContent>

                <TabsContent value="cancelled">
                  <OrderList orders={cancelledOrders} onCancel={handleCancel} showCancel={false} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * 订单列表组件
 */
function OrderList({ 
  orders, 
  onCancel, 
  showCancel = true 
}: { 
  orders: any[]
  onCancel: (orderId: string) => void
  showCancel?: boolean
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无订单
      </div>
    )
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.orderId} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={order.workingSide === 'BUY' ? 'default' : 'destructive'}>
                  {order.workingSide === 'BUY' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {order.workingSide}
                </Badge>
                <Badge variant="outline">
                  {order.status}
                </Badge>
              </div>
              {showCancel && order.status === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(order.orderId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">交易对</div>
                <div className="font-medium">{order.baseAsset}/{order.quoteAsset}</div>
              </div>
              <div>
                <div className="text-muted-foreground">价格</div>
                <div className="font-medium">{order.workingPrice}</div>
              </div>
              <div>
                <div className="text-muted-foreground">数量</div>
                <div className="font-medium">{order.workingQuantity}</div>
              </div>
              <div>
                <div className="text-muted-foreground">已成交</div>
                <div className="font-medium">{order.executedQuantity}</div>
              </div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              创建时间: {dayjs(order.createTime).format('YYYY-MM-DD HH:mm:ss')}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
