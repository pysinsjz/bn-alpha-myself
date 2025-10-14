'use client'

import type { Hex } from 'viem'
import { useEffect, useState } from 'react'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { AlertCircle, ArrowDownUp, CheckCircle2, Loader2, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/custom-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/components/ui/toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import alphaTokens from '@/constants/tokens'
import { USDT_ADDRESS, USDC_ADDRESS, WBNB_ADDRESS } from '@/constants'
import { buildSwapTransaction } from '@/lib/swap'
import { isAddressEqual } from '@/lib/utils'
import { useTokenBalance } from '@/hooks/use-token-balance'
import { useRealtimePrice } from '@/hooks/use-realtime-price'
import dayjs from '@/lib/dayjs'

const STABLE_TOKENS = [
  { address: USDT_ADDRESS, symbol: 'USDT', decimals: 18 },
  { address: USDC_ADDRESS, symbol: 'USDC', decimals: 18 },
  { address: WBNB_ADDRESS, symbol: 'WBNB', decimals: 18 },
]

export default function SwapTransaction() {
  const { address: walletAddress, isConnected } = useAccount()
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [fromToken, setFromToken] = useState<Hex>(USDT_ADDRESS)
  const [toToken, setToToken] = useState<Hex>(alphaTokens[0]?.contractAddress || USDT_ADDRESS)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [isEstimating, setIsEstimating] = useState(false)

  const selectedFromToken = STABLE_TOKENS.find(t => isAddressEqual(t.address, fromToken))
  const selectedToToken = alphaTokens.find(t => isAddressEqual(t.contractAddress, toToken))

  // 获取代币余额
  const fromTokenBalance = useTokenBalance(fromToken, selectedFromToken?.decimals)
  const toTokenBalance = useTokenBalance(toToken, selectedToToken?.decimals)

  // 获取实时价格（仅对目标代币）
  const realtimePrice = useRealtimePrice(
    selectedToToken ? toToken : undefined,
    selectedFromToken?.symbol || 'USDC',
    1000, // 每秒更新
  )

  // 当输入金额或实时价格变化时，自动计算输出
  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0 && realtimePrice.price) {
      const price = Number(realtimePrice.price)
      if (price > 0) {
        const inputAmount = Number(fromAmount)
        const estimatedOutput = inputAmount / price
        setToAmount(estimatedOutput.toFixed(6))
      }
      else {
        setToAmount('')
      }
    }
    else {
      setToAmount('')
    }
  }, [fromAmount, realtimePrice.price])

  const handleSwap = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('请先连接钱包')
      return
    }

    if (!fromAmount || Number(fromAmount) <= 0) {
      toast.error('请输入有效的金额')
      return
    }

    if (!selectedFromToken || !selectedToToken) {
      toast.error('请选择代币')
      return
    }

    try {
      const tx = buildSwapTransaction({
        fromToken,
        toToken,
        fromAmount,
        fromDecimals: selectedFromToken.decimals,
        minReturnAmount: toAmount,
        slippage: Number(slippage),
      })

      sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      })
    }
    catch (err: any) {
      console.error('构建交易失败:', err)
      toast.error(`交易失败: ${err.message || '未知错误'}`)
    }
  }

  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount('')
  }

  const setMaxAmount = () => {
    if (fromTokenBalance.formatted) {
      setFromAmount(fromTokenBalance.formatted)
    }
  }

  useEffect(() => {
    if (isSuccess) {
      toast.success('交易成功！')
      setFromAmount('')
      setToAmount('')
    }
  }, [isSuccess])

  useEffect(() => {
    if (error) {
      toast.error(`交易失败: ${error.message}`)
    }
  }, [error])

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>交易 Alpha 代币</CardTitle>
        <CardDescription>买入或卖出 Binance Alpha 代币</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>请先连接钱包以进行交易</AlertDescription>
          </Alert>
        )}

        {/* 源代币 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">支付</label>
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={setMaxAmount}
                disabled={!fromTokenBalance.formatted || fromTokenBalance.isLoading}
                className="h-6 px-2 text-xs"
              >
                最大
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={e => setFromAmount(e.target.value)}
              disabled={!isConnected}
              className="flex-1"
            />
            <Select
              value={fromToken}
              onValueChange={value => setFromToken(value as Hex)}
              disabled={!isConnected}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STABLE_TOKENS.map(token => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span>
                余额: {fromTokenBalance.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `${Number(fromTokenBalance.formatted).toFixed(6)} ${selectedFromToken?.symbol || ''}`
                )}
              </span>
            </div>
          )}
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={swapTokens}
            disabled={!isConnected}
            className="rounded-full"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* 目标代币 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">接收（预估）</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              disabled
              className="flex-1"
            />
            <Select
              value={toToken}
              onValueChange={value => setToToken(value as Hex)}
              disabled={!isConnected}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {alphaTokens.map(token => (
                  <SelectItem key={token.contractAddress} value={token.contractAddress}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span>
                余额: {toTokenBalance.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `${Number(toTokenBalance.formatted).toFixed(6)} ${selectedToToken?.symbol || ''}`
                )}
              </span>
            </div>
          )}
        </div>

        {/* 实时价格信息 - 固定高度避免跳动 */}
        {selectedToToken && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2 min-h-[80px]">
            {realtimePrice.isLoading && !realtimePrice.price ? (
              // 首次加载骨架屏
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ) : realtimePrice.price ? (
              // 价格信息
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">实时价格</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ${Number(realtimePrice.price).toFixed(8)}
                    </span>
                    {realtimePrice.priceChange24h && (
                      <Badge
                        variant={Number(realtimePrice.priceChange24h) >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {Number(realtimePrice.priceChange24h) >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Number(realtimePrice.priceChange24h).toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
                {realtimePrice.volume24h && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">24h 交易量</span>
                    <span>${Number(realtimePrice.volume24h).toLocaleString()}</span>
                  </div>
                )}
              </>
            ) : realtimePrice.error ? (
              // 错误提示
              <div className="text-xs text-muted-foreground">
                {realtimePrice.error}
              </div>
            ) : null}
          </div>
        )}

        {/* 最近成交记录 */}
        {selectedToToken && realtimePrice.recentTrades.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">最近成交</label>
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
            <ScrollArea className="h-32 w-full border rounded-lg">
              <div className="p-2 space-y-1">
                {realtimePrice.recentTrades.slice(0, 10).map((trade, index) => {
                  // m = false 表示买方主动成交（买入），显示绿色
                  // m = true 表示卖方主动成交（卖出），显示红色
                  const isBuy = !trade.m
                  return (
                    <div
                      key={`${trade.a}-${index}`}
                      className="flex items-center justify-between text-xs py-1 hover:bg-muted/50 rounded px-2"
                    >
                      <span className="text-muted-foreground w-16">
                        {dayjs(trade.T).format('HH:mm:ss')}
                      </span>
                      <span
                        className={`font-medium w-28 text-right ${
                          isBuy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        ${Number(trade.p).toFixed(8)}
                      </span>
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
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 滑点设置 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">滑点容忍度 (%)</label>
          <Input
            type="number"
            placeholder="0.5"
            value={slippage}
            onChange={e => setSlippage(e.target.value)}
            disabled={!isConnected}
            step="0.1"
            min="0.1"
            max="50"
          />
        </div>

        {/* 交易按钮 */}
        <Button
          onClick={handleSwap}
          disabled={!isConnected || isPending || isConfirming || !fromAmount || Number(fromAmount) <= 0}
          className="w-full"
          size="lg"
        >
          {isPending && (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              确认交易...
            </>
          )}
          {isConfirming && (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              等待确认...
            </>
          )}
          {!isPending && !isConfirming && '交易'}
        </Button>

        {/* 交易哈希 */}
        {hash && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>交易已提交</AlertTitle>
            <AlertDescription>
              <a
                href={`https://bscscan.com/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                在区块浏览器中查看
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* 警告信息 */}
        <Alert variant="destructive" className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-600 dark:text-yellow-400">重要提示</AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>这是一个演示功能，实际交易数据构建需要根据具体的 DEX 路由器实现</li>
              <li>请确保您理解交易的风险</li>
              <li>建议先进行小额测试交易</li>
              <li>注意滑点和价格影响</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

