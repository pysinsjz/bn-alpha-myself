'use client'

import type { Hex } from 'viem'
import { useEffect, useState } from 'react'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, maxUint256, encodeFunctionData } from 'viem'
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
import { getSimpleLifiQuote, formatAmountToWei, testLifiParameterEffects } from '@/lib/lifi-simple'
import { debugTransactionData, analyzeTransactionDifference } from '@/lib/transaction-parser'
import { isAddressEqual } from '@/lib/utils'
import { useTokenBalance } from '@/hooks/use-token-balance'
import { useRealtimePrice } from '@/hooks/use-realtime-price'
import { useAutoConnect } from '@/hooks/use-auto-connect'
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
  
  // 使用自动重连 Hook
  const { isAutoConnecting } = useAutoConnect()

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
  const [lifiRoutes, setLifiRoutes] = useState<any[]>([])
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  
  // LI.FI 高级设置
  const [lifiOrder, setLifiOrder] = useState<'CHEAPEST' | 'FASTEST' | 'SAFEST'>('FASTEST')
  const [allowedExchanges, setAllowedExchanges] = useState<string[]>(['pancakeswap'])

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
  // LI.FI 路由器地址 - 从 LI.FI 返回的交易数据中获取
  const LIFI_ROUTER_ADDRESS = '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae' as Hex
  const routerAddress = useLifi ? LIFI_ROUTER_ADDRESS : BN_DEX_ROUTER_ADDRESS
  
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

  // 当输入金额变化时，自动查询 LI.FI 路由
  useEffect(() => {
    if (useLifi && fromAmount && Number(fromAmount) > 0) {
      // 防抖处理，避免频繁请求
      const timer = setTimeout(() => {
        fetchLifiRoutes()
      }, 1000) // 1秒后执行

      return () => clearTimeout(timer)
    } else {
      setLifiRoutes([])
    }
  }, [fromAmount, fromToken, toToken, slippage, useLifi, walletAddress, lifiOrder, allowedExchanges])

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

    // 检查交易金额
    if (!fromAmount || Number(fromAmount) <= 0) {
      toast.error('请输入有效的交易金额')
      return
    }

    // 检查余额是否足够
    if (fromTokenBalance.formatted && Number(fromAmount) > Number(fromTokenBalance.formatted)) {
      toast.error('余额不足')
      return
    }

    // 检查是否为 Alpha 代币，给出警告
    const isAlphaToken = alphaTokens.some(token => 
      token.contractAddress.toLowerCase() === fromToken.toLowerCase() ||
      token.contractAddress.toLowerCase() === toToken.toLowerCase()
    )
    
    if (isAlphaToken) {
      toast.warning('Alpha 代币流动性较低，建议使用较小金额测试')
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
        
        // 调试信息：显示精度处理结果
        console.log('LI.FI 交易调试信息:', {
          原始金额: fromAmount,
          代币精度: selectedFromToken.decimals,
          格式化后金额: formattedAmount,
          代币符号: selectedFromToken.symbol,
          滑点设置: `${slippage}%`,
          排序方式: lifiOrder,
          允许的交易所: allowedExchanges,
          源代币地址: fromToken,
          目标代币地址: toToken
        })

        // 获取 LI.FI 报价
        const lifiQuote = await getSimpleLifiQuote({
          fromToken,
          toToken,
          amount: formattedAmount,
          userAddress: walletAddress,
          slippage: Number(slippage),
          allowExchanges: allowedExchanges,
          order: lifiOrder,
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
        
        // 调试 LI.FI 交易数据
        console.log('=== LI.FI 交易数据分析 ===')
        console.log('授权地址:', routerAddress)
        console.log('交易目标地址:', lifiQuote.to)
        debugTransactionData({
          to: lifiQuote.to,
          data: lifiQuote.data,
          value: lifiQuote.value
        })
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
        
        // 调试聚合器交易数据
        console.log('=== 聚合器交易数据分析 ===')
        debugTransactionData({
          to: BN_DEX_ROUTER_ADDRESS,
          data: quote.data,
          value: quote.value
        })
      } else {
        // 使用真实链上数据格式
        console.log('真实交易调试信息:', {
          原始金额: fromAmount,
          代币精度: selectedFromToken.decimals,
          代币符号: selectedFromToken.symbol,
          源代币地址: fromToken,
          目标代币地址: toToken,
          滑点: slippage
        })
        
        tx = buildRealSwapTransaction({
        fromToken,
        toToken,
        fromAmount,
        fromDecimals: selectedFromToken.decimals,
        minReturnAmount: toAmount,
        slippage: Number(slippage),
      })
        
        // 调试真实交易数据
        console.log('=== 真实交易数据分析 ===')
        debugTransactionData({
          to: tx.to,
          data: tx.data,
          value: tx.value.toString()
        })
      }

      sendTransaction({
        to: tx.to,
        // data: tx.data,
        data: "0x810c705b00000000000000000000000094a11745a8d33388ee635b55f43944f1202c13d40000000000000000000000003d90f66b534dd8482b181e24655a9e8265316be900000000000000000000000155d398326f99059ff775485246999027b31979550000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000e6df05ce8c8301223373cf5b969afcb1498c55280000000000000000000000000000000000000000000000000092378c1ba39aa300000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000004c4b80c2f09000000000000000000000000000000000000000000000000c0e1fa936cdb4f3500000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000e6df05ce8c8301223373cf5b969afcb1498c55280000000000000000000000000000000000000000000000001bc0b7812dd380000000000000000000000000000000000000000000000000000092378c1ba39aa40000000000000000000000000000000000000000000000000000000068efc27b00000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000046000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000001bc0b7812dd38000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ca852767b43a395ac1dd54737193eba5e20c78bd0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000ca852767b43a395ac1dd54737193eba5e20c78bd0000000000000000000000000000000000000000000000000000000000000001000000000000000000002710cf59b8c8baa2dea520e3d549f97d4e49ade170570000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000006000000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000e6df05ce8c8301223373cf5b969afcb1498c5528000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as Hex,
        value: tx.value,
      })
    }
    catch (err: any) {
      console.error('构建交易失败:', err)
      toast.error(`交易失败: ${err.message || '未知错误'}`)
    }
  }

  // 查询 LI.FI 路由
  const fetchLifiRoutes = async () => {
    if (!isConnected || !walletAddress || !fromAmount || Number(fromAmount) <= 0) {
      setLifiRoutes([])
      return
    }

    if (!selectedFromToken || !selectedToToken) {
      setLifiRoutes([])
      return
    }

    setIsLoadingRoutes(true)
    try {
      const formattedAmount = formatAmountToWei(fromAmount, selectedFromToken.decimals)
      
      const routes = await getLifiRoutes({
        fromToken,
        toToken,
        amount: formattedAmount,
        slippage: Number(slippage),
        userAddress: walletAddress,
        allowExchanges: allowedExchanges,
        order: lifiOrder,
      })

      if (routes && routes.length > 0) {
        // 过滤路由，只显示允许的交易所
        const filteredRoutes = routes.filter(route => {
          if (!route.route?.steps) return true
          
          // 检查所有步骤是否都使用允许的交易所
          const isValidRoute = route.route.steps.every((step: any) => {
            if (!step.tool) return true
            const toolLower = step.tool.toLowerCase()
            const isAllowed = allowedExchanges.includes(toolLower)
            
            if (!isAllowed) {
              console.log(`路由被过滤: 使用了不允许的交易所 "${step.tool}"`)
            }
            
            return isAllowed
          })
          
          if (!isValidRoute) {
            console.log('路由被过滤，包含不允许的交易所')
          }
          
          return isValidRoute
        })
        
        setLifiRoutes(filteredRoutes)
        console.log('LI.FI 路由查询结果 (原始):', routes)
        console.log('LI.FI 路由查询结果 (过滤后):', filteredRoutes)
        
        // 打印详细的路由信息
        filteredRoutes.forEach((route, index) => {
          console.log(`\n=== 过滤后路由 ${index + 1} 详细信息 ===`)
          console.log('路由对象:', route.route)
          console.log('预估 Gas:', route.estimatedGas)
          console.log('价格影响:', route.priceImpact)
          
          if (route.route) {
            console.log('输入金额 (原始):', route.route.fromAmount)
            console.log('输入金额 (格式化):', formatTokenAmount(
              route.route.fromAmount, 
              selectedFromToken?.decimals || 18, 
              selectedFromToken?.symbol || 'TOKEN'
            ))
            console.log('输出金额 (原始):', route.route.toAmount)
            console.log('输出金额 (格式化):', formatTokenAmount(
              route.route.toAmount, 
              selectedToToken?.decimals || 18, 
              selectedToToken?.symbol || 'TOKEN'
            ))
            console.log('交易步骤数量:', route.route.steps?.length || 0)
            
            if (route.route.steps && route.route.steps.length > 0) {
              route.route.steps.forEach((step: any, stepIndex: number) => {
                console.log(`  步骤 ${stepIndex + 1}:`, {
                  type: step.type,
                  tool: step.tool,
                  fromChain: step.action?.fromChainId,
                  toChain: step.action?.toChainId,
                  fromToken: step.action?.fromToken?.address,
                  toToken: step.action?.toToken?.address,
                  gasEstimate: step.estimate?.gasCosts?.[0]?.amount
                })
              })
            }
          }
        })
      } else {
        setLifiRoutes([])
        console.log('未找到可用的 LI.FI 路由')
      }
    } catch (error) {
      console.error('查询 LI.FI 路由失败:', error)
      setLifiRoutes([])
    } finally {
      setIsLoadingRoutes(false)
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

  // 设置建议的小额测试金额
  const setTestAmount = () => {
    if (fromTokenBalance.formatted) {
      const balance = Number(fromTokenBalance.formatted)
      // 使用余额的 1% 作为测试金额，最小 0.001
      const testAmount = Math.max(balance * 0.01, 0.001)
      setFromAmount(testAmount.toFixed(6))
    }
  }

  // 测试 LI.FI 参数对方法选择的影响
  const testLifiParameters = async () => {
    if (!isConnected || !walletAddress || !fromAmount || !selectedFromToken || !selectedToToken) {
      toast.error('请先连接钱包并输入交易金额')
      return
    }

    const formattedAmount = formatAmountToWei(fromAmount, selectedFromToken.decimals)
    
    await testLifiParameterEffects({
      fromToken,
      toToken,
      amount: formattedAmount,
      userAddress: walletAddress,
    })
  }

  // 格式化代币金额显示
  const formatTokenAmount = (amount: string, decimals: number, symbol: string): string => {
    try {
      if (!amount || amount === '0') return '0'
      
      // 将 wei 格式转换为可读格式
      const formatted = formatUnits(BigInt(amount), decimals)
      const num = parseFloat(formatted)
      
      // 根据数值大小选择合适的精度
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M ${symbol}`
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K ${symbol}`
      } else if (num >= 1) {
        return `${num.toFixed(4)} ${symbol}`
      } else {
        return `${num.toFixed(6)} ${symbol}`
      }
    } catch (error) {
      console.error('格式化代币金额失败:', error)
      return `${amount} ${symbol}`
    }
  }

  // 格式化 Gas 费用显示
  const formatGasAmount = (gasAmount: string): string => {
    try {
      if (!gasAmount || gasAmount === '0') return '0'
      
      const gas = BigInt(gasAmount)
      const gasInGwei = Number(gas) / 1e9 // 转换为 Gwei
      
      if (gasInGwei >= 1000) {
        return `${(gasInGwei / 1000).toFixed(2)}K Gwei`
      } else {
        return `${gasInGwei.toFixed(2)} Gwei`
      }
    } catch (error) {
      console.error('格式化 Gas 费用失败:', error)
      return gasAmount
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
      toast.error(`交易失败: ${error.message}`, {
        duration: 5000, // 只显示5秒
      })
    }
  }, [error])

  return (
    <div className="w-full max-w-6xl mx-auto flex gap-6">
      {/* 左侧交易区域 */}
      <Card className="flex-1">
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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setTestAmount}
                  disabled={!fromTokenBalance.formatted || fromTokenBalance.isLoading}
                  className="h-6 px-2 text-xs"
                  title="设置小额测试金额（余额的1%）"
                >
                  测试
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={setMaxAmount}
                  disabled={!fromTokenBalance.formatted || fromTokenBalance.isLoading}
                  className="h-6 px-2 text-xs"
                >
                  最大
                </Button>
              </div>
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

        {/* LI.FI 高级设置 */}
        {useLifi && (
          <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              LI.FI 高级设置
            </div>
            
            {/* 排序方式 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-blue-700 dark:text-blue-300">排序方式</label>
              <div className="flex gap-2">
                {(['CHEAPEST', 'FASTEST', 'SAFEST'] as const).map((order) => (
                  <Button
                    key={order}
                    type="button"
                    variant={lifiOrder === order ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLifiOrder(order)}
                    className="flex-1 text-xs"
                  >
                    {order === 'CHEAPEST' && '最便宜'}
                    {order === 'FASTEST' && '最快'}
                    {order === 'SAFEST' && '最安全'}
                  </Button>
                ))}
              </div>
            </div>

            {/* 允许的交易所 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-blue-700 dark:text-blue-300">允许的交易所</label>
              <div className="flex flex-wrap gap-1">
                {['pancakeswap', 'uniswap', 'sushiswap', '1inch', 'kyberswap'].map((exchange) => (
                  <Button
                    key={exchange}
                    type="button"
                    variant={allowedExchanges.includes(exchange) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (allowedExchanges.includes(exchange)) {
                        setAllowedExchanges(allowedExchanges.filter(e => e !== exchange))
                      } else {
                        setAllowedExchanges([...allowedExchanges, exchange])
                      }
                    }}
                    className="text-xs h-6 px-2"
                  >
                    {exchange}
                  </Button>
                ))}
              </div>
            </div>

            {/* 参数测试按钮 */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testLifiParameters}
                disabled={!isConnected || !fromAmount}
                className="w-full text-xs"
              >
                测试参数对方法选择的影响
              </Button>
            </div>
          </div>
        )}

        {/* Alpha 代币警告 */}
        {(() => {
          const isAlphaToken = alphaTokens.some(token => 
            token.contractAddress.toLowerCase() === fromToken.toLowerCase() ||
            token.contractAddress.toLowerCase() === toToken.toLowerCase()
          )
          
          if (isAlphaToken) {
            return (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      Alpha 代币交易提醒
                    </div>
                    <div className="text-yellow-700 dark:text-yellow-300 mt-1">
                      • 流动性较低，建议使用小额测试<br/>
                      • 滑点可能较大，建议设置 3% 以上<br/>
                      • 交易可能失败，请谨慎操作
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* LI.FI 方法不一致警告 */}
        {useLifi && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200">
                  LI.FI 方法签名说明
                </div>
                <div className="text-blue-700 dark:text-blue-300 mt-1">
                  • 钱包显示: swapTokensMultipleV3ERC20ToERC20<br/>
                  • 实际执行: 底层 DEX 的具体方法<br/>
                  • 已禁用跨链桥，强制使用同链交换<br/>
                  • 可能原因: 排序方式、允许的交易所、价格影响限制<br/>
                  • 点击上方"测试参数"按钮查看不同参数的影响
                </div>
              </div>
            </div>
          </div>
        )}

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
            disabled={!isConnected || isPending || isConfirming || !fromAmount || Number(fromAmount) <= 0 || isAutoConnecting}
          className="w-full"
          size="lg"
        >
            {isAutoConnecting && (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                重连钱包中...
              </>
            )}
            {isPending && !isAutoConnecting && (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              确认交易...
            </>
          )}
            {isConfirming && !isAutoConnecting && (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              等待确认...
            </>
          )}
            {!isPending && !isConfirming && !isAutoConnecting && '交易'}
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
              首次交易该代币需要先授权给路由器合约，这是一次性操作。
              {useLifi && (
                <div className="mt-1">
                  授权地址: {routerAddress}
                </div>
              )}
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
              <li><strong>自动路由查询</strong>：输入金额后自动查询可用路由</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>

      {/* 右侧路由显示区域 */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-lg">LI.FI 路由信息</CardTitle>
          <CardDescription>实时查询的交易路由</CardDescription>
        </CardHeader>
        <CardContent>
          {useLifi && fromAmount && Number(fromAmount) > 0 ? (
            <div className="space-y-4">
              {/* 查询状态 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">查询状态</span>
                {isLoadingRoutes ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-gray-500">查询中...</span>
                  </div>
                ) : (
                  <span className="text-xs text-green-600">已完成</span>
                )}
              </div>

              {/* 路由结果 */}
              {lifiRoutes.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-green-600 font-medium">
                    找到 {lifiRoutes.length} 条可用路由
                    <div className="text-xs text-gray-500 mt-1">
                      允许的交易所: {allowedExchanges.join(', ')}
                    </div>
                  </div>
                  
                  {lifiRoutes.map((route, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">路由 {index + 1}</span>
                        <span className="text-xs text-green-600">
                          Gas: {formatGasAmount(route.estimatedGas)}
                        </span>
                      </div>
                      
                      {/* 路由详细信息 */}
                      {route.route && (
                        <div className="space-y-2 text-xs">
                          {/* 输入输出信息 */}
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">输入:</span>
                            <span className="text-right">
                              {formatTokenAmount(
                                route.route.fromAmount, 
                                selectedFromToken?.decimals || 18, 
                                selectedFromToken?.symbol || 'TOKEN'
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">输出:</span>
                            <span className="text-right">
                              {formatTokenAmount(
                                route.route.toAmount, 
                                selectedToToken?.decimals || 18, 
                                selectedToToken?.symbol || 'TOKEN'
                              )}
                            </span>
                          </div>
                          
                          {/* 步骤信息 */}
                          {route.route.steps && route.route.steps.length > 0 && (
                            <div>
                              <div className="text-gray-600 dark:text-gray-400 mb-1">交易步骤:</div>
                              {route.route.steps.map((step: any, stepIndex: number) => (
                                <div key={stepIndex} className="ml-2 p-1 bg-white dark:bg-gray-700 rounded text-xs">
                                  <div className="font-medium">{step.type}</div>
                                  {step.tool && (
                                    <div className="text-gray-500">工具: {step.tool}</div>
                                  )}
                                  {step.estimate && step.estimate.gasCosts && (
                                    <div className="text-gray-500">
                                      Gas: {formatGasAmount(step.estimate.gasCosts[0]?.amount || '0')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* 价格影响 */}
                          {route.route.estimate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">价格影响:</span>
                              <span className={route.route.estimate.priceImpact > 0.01 ? 'text-red-600' : 'text-green-600'}>
                                {(route.route.estimate.priceImpact * 100).toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : !isLoadingRoutes && fromAmount && Number(fromAmount) > 0 ? (
                <div className="text-center py-4">
                  <div className="text-yellow-600 text-sm">未找到可用的路由</div>
                  <div className="text-xs text-gray-500 mt-1">
                    请检查代币对或调整金额
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500 text-sm">请输入金额开始查询</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">请选择 LI.FI 模式并输入金额</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

