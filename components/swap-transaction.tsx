'use client'

import type { Hex } from 'viem'
import { useEffect, useState } from 'react'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, maxUint256, encodeFunctionData } from 'viem'
import { AlertCircle, ArrowDownUp, CheckCircle2, Loader2, Wallet, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/custom-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/components/ui/toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import alphaTokens from '@/constants/tokens'
import { USDT_ADDRESS, USDC_ADDRESS, WBNB_ADDRESS, BN_DEX_ROUTER_ADDRESS } from '@/constants'
import { ERC20_ABI } from '@/constants/abis'
import { buildSwapTransaction, buildRealSwapTransaction } from '@/lib/swap'
import { getAggregatorQuote, parseTransactionData } from '@/lib/aggregator-api'
import { getLifiQuote, getLifiRoutes, executeLifiRoute, formatAmountForLifi } from '@/lib/lifi-api'
import { getSimpleLifiQuote, formatAmountToWei } from '@/lib/lifi-simple'
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
  const [isApproving, setIsApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [useAggregator, setUseAggregator] = useState(false)
  const [useLifi, setUseLifi] = useState(true) // 默认使用 LI.FI

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

  // 检查代币授权额度 - 根据选择的模式使用不同的路由器地址
  const routerAddress = useLifi ? BN_DEX_ROUTER_ADDRESS : BN_DEX_ROUTER_ADDRESS
  
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: fromToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress, routerAddress] : undefined,
    query: {
      enabled: !!walletAddress && !!fromToken && !isAddressEqual(fromToken, WBNB_ADDRESS),
    },
  })

  // 检查是否需要授权
  useEffect(() => {
    if (!walletAddress || !fromAmount || Number(fromAmount) <= 0) {
      setNeedsApproval(false)
      return
    }

    // BNB 不需要授权
    if (isAddressEqual(fromToken, WBNB_ADDRESS)) {
      setNeedsApproval(false)
      return
    }

    if (selectedFromToken && allowance !== undefined) {
      try {
        const amount = parseUnits(fromAmount, selectedFromToken.decimals)
        setNeedsApproval(allowance < amount)
      }
      catch {
        setNeedsApproval(false)
      }
    }
  }, [fromAmount, fromToken, allowance, walletAddress, selectedFromToken])

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

  const handleApprove = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('请先连接钱包')
      return
    }

    if (!selectedFromToken) {
      toast.error('请选择代币')
      return
    }

    try {
      setIsApproving(true)
      
      // 构建授权交易
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, maxUint256],
      }) as Hex

      // 发送授权交易
      const result = await sendTransaction({
        to: fromToken,
        data,
      })

      toast.success('授权交易已提交，等待确认...')
      
      // 等待交易确认
      // 注意：这里需要等待交易确认后才能继续
      setTimeout(() => {
        refetchAllowance()
      }, 3000)
    }
    catch (err: any) {
      console.error('授权失败:', err)
      toast.error(`授权失败: ${err.message || '未知错误'}`)
    }
    finally {
      setIsApproving(false)
    }
  }

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

    // 检查是否需要授权
    if (needsApproval) {
      toast.error('请先授权代币')
      return
    }

    try {
      let tx

      if (useLifi) {
        // 使用简化的 LI.FI API
        const formattedAmount = formatAmountToWei(fromAmount, selectedFromToken.decimals)

        // 获取 LI.FI 报价
        const lifiQuote = await getSimpleLifiQuote({
          fromToken,
          toToken,
          amount: formattedAmount,
          userAddress: walletAddress,
        })

        if (!lifiQuote) {
          toast.error('无法获取 LI.FI 报价，请检查网络连接')
          return
        }

        // 使用 LI.FI 返回的交易数据
        tx = {
          to: lifiQuote.to,
          data: lifiQuote.data,
          value: BigInt(lifiQuote.value),
        }
      } else if (useAggregator) {
        // 使用聚合器获取真实的路由数据
        const quote = await getAggregatorQuote({
          fromToken,
          toToken,
          amount: fromAmount,
          slippage: Number(slippage),
        })

        if (!quote || quote.data === '0x') {
          toast.error('无法获取聚合器报价，请尝试关闭聚合器模式')
          return
        }

        // 使用聚合器返回的数据
        tx = {
          to: BN_DEX_ROUTER_ADDRESS,
          data: quote.data,
          value: BigInt(quote.value),
        }
      } else {
        // 使用真实链上数据格式
        tx = buildRealSwapTransaction({
          fromToken,
          toToken,
          fromAmount,
          fromDecimals: selectedFromToken.decimals,
          minReturnAmount: toAmount,
          slippage: Number(slippage),
        })
      }

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

        {/* 交易模式选择 */}
        <div className="space-y-3">
          <label className="text-sm font-medium">交易模式</label>
          
          {/* LI.FI 模式 */}
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="useLifi"
              name="swapMode"
              checked={useLifi}
              onChange={() => {
                setUseLifi(true)
                setUseAggregator(false)
              }}
              className="rounded border-gray-300"
            />
            <label htmlFor="useLifi" className="text-sm font-medium">
              LI.FI 聚合器（推荐）
            </label>
          </div>

          {/* 自定义聚合器模式 */}
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="useAggregator"
              name="swapMode"
              checked={useAggregator}
              onChange={() => {
                setUseAggregator(true)
                setUseLifi(false)
              }}
              className="rounded border-gray-300"
            />
            <label htmlFor="useAggregator" className="text-sm font-medium">
              自定义聚合器模式
            </label>
          </div>

          {/* 简化模式 */}
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="useSimple"
              name="swapMode"
              checked={!useLifi && !useAggregator}
              onChange={() => {
                setUseLifi(false)
                setUseAggregator(false)
              }}
              className="rounded border-gray-300"
            />
            <label htmlFor="useSimple" className="text-sm font-medium">
              简化模式（测试用）
            </label>
          </div>
        </div>

        {/* 授权和交易按钮 */}
        {needsApproval ? (
          <Button
            onClick={handleApprove}
            disabled={!isConnected || isApproving || !fromAmount || Number(fromAmount) <= 0}
            className="w-full"
            size="lg"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                授权中...
              </>
            ) : (
              `授权 ${selectedFromToken?.symbol || ''}`
            )}
          </Button>
        ) : (
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
        )}

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

        {/* 授权提示 */}
        {needsApproval && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-600 dark:text-blue-400">需要授权</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
              首次交易该代币需要先授权给币安 DEX Router，这是一次性操作。
            </AlertDescription>
          </Alert>
        )}

        {/* 交易信息 */}
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-600 dark:text-green-400">🌉 LI.FI 集成</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li><strong>LI.FI 模式</strong>：开源跨链聚合器，支持多链交易和桥接</li>
              <li><strong>支持链</strong>：BSC、Ethereum、Polygon、Arbitrum、Optimism 等</li>
              <li><strong>功能</strong>：DEX 聚合、跨链桥接、最优路由选择</li>
              <li><strong>API 文档</strong>：<a href="https://docs.li.fi/sdk/chains-tools" target="_blank" rel="noopener noreferrer" className="underline">docs.li.fi</a></li>
              <li>支持滑点保护，自动选择最优价格和路由</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

