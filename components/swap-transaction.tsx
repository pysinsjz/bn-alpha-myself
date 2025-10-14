'use client'

import type { Hex } from 'viem'
import { useEffect, useState } from 'react'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { AlertCircle, ArrowDownUp, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/custom-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/components/ui/toast'
import alphaTokens from '@/constants/tokens'
import { USDT_ADDRESS, USDC_ADDRESS, WBNB_ADDRESS } from '@/constants'
import { buildSwapTransaction, estimateSwapOutput } from '@/lib/swap'
import { isAddressEqual } from '@/lib/utils'

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
  const [toToken, setToToken] = useState<Hex>(alphaTokens[0]?.contractAddress || '' as Hex)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [isEstimating, setIsEstimating] = useState(false)

  const selectedFromToken = STABLE_TOKENS.find(t => isAddressEqual(t.address, fromToken))
  const selectedToToken = alphaTokens.find(t => isAddressEqual(t.contractAddress, toToken))

  // 当输入金额变化时，估算输出
  useEffect(() => {
    if (fromAmount && Number(fromAmount) > 0 && fromToken && toToken) {
      estimateOutput()
    }
    else {
      setToAmount('')
    }
  }, [fromAmount, fromToken, toToken])

  const estimateOutput = async () => {
    if (!selectedFromToken || !selectedToToken)
      return

    setIsEstimating(true)
    try {
      const result = await estimateSwapOutput({
        fromToken,
        toToken,
        fromAmount,
        fromDecimals: selectedFromToken.decimals,
      })
      setToAmount(result.outputAmount)
    }
    catch (err) {
      console.error('估算失败:', err)
      toast.error('无法估算输出金额')
    }
    finally {
      setIsEstimating(false)
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
          <label className="text-sm font-medium">支付</label>
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
          {isEstimating && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在估算...
            </p>
          )}
        </div>

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

