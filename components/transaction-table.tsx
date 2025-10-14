'use client'

import type { TokenInfo, TransactionInfo } from '@/types'
import { Clock, ExternalLink, Filter } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import alphaTokens from '@/constants/tokens'
import { useLocalStorage } from '@/hooks/use-local-storage'
import dayjs from '@/lib/dayjs'
import { cn, formatAddress, isAddressEqual } from '@/lib/utils'

interface TransactionsTableProps {
  data: {
    transactions: TransactionInfo[]
    tokens: TokenInfo[]
  }
  isLoading: boolean
}

interface TransactionSettings {
  activeTab: '0' | '1'
  filter: 'all' | 'buy' | 'sell'
  showFailed: boolean
  timeFormat: 'relative' | 'absolute'
}

function TransactionTableSkeleton() {
  return (
    <Tabs value="0" className="w-full">
      <TabsList>
        <TabsTrigger value="0">
          交易视图
          <Badge variant="secondary" className="flex items-center justify-center rounded-full bg-muted-foreground/30">
            0
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="1">
          代币视图
          <Badge variant="secondary" className="flex items-center justify-center rounded-full bg-muted-foreground/30">
            0
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="0">
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>交易哈希</TableHead>
                  <TableHead className="flex items-center">
                    时间
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Clock className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>源代币</TableHead>
                  <TableHead>目标代币</TableHead>
                  <TableHead className="text-right">手续费</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Skeleton className="h-5 w-28" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="1">
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>代币</TableHead>
                  <TableHead>流入</TableHead>
                  <TableHead>流出</TableHead>
                  <TableHead>净流入</TableHead>
                  <TableHead className="text-right">利润</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Skeleton className="h-5 w-36" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default function TransactionTable({ data, isLoading }: TransactionsTableProps) {
  const { transactions, tokens } = data
  const [settings, setSettings] = useLocalStorage<TransactionSettings>('transactionSettings', {
    activeTab: '0',
    filter: 'all',
    showFailed: false,
    timeFormat: 'relative',
  })

  const filteredTransactions = useMemo(() => {
    let filtered = transactions
    switch (settings.filter) {
      case 'buy':
        filtered = transactions.filter(tx =>
          alphaTokens.some(token => isAddressEqual(token.contractAddress, tx.to.address)),
        )
        break
      case 'sell':
        filtered = transactions.filter(tx =>
          alphaTokens.some(token => isAddressEqual(token.contractAddress, tx.from.address)),
        )
        break
      case 'all':
      default:
        filtered = transactions
        break
    }

    if (!settings.showFailed) {
      filtered = filtered.filter(tx => tx.status === 'success')
    }
    return filtered
  }, [transactions, settings.filter, settings.showFailed])

  if (isLoading) {
    return <TransactionTableSkeleton />
  }

  const filterTitle = () => {
    switch (settings.filter) {
      case 'buy':
        return '买入'
      case 'sell':
        return '卖出'
      default:
        return '全部'
    }
  }

  const getPnL = (token: TokenInfo): string => {
    const netFlow = token.in - token.out
    if (netFlow === 0)
      return '0.00'
    const profit = netFlow * token.price
    return profit.toFixed(2)
  }

  const getValueColor = (value: number): string => {
    if (value > 0)
      return 'text-green-600'
    if (value < 0)
      return 'text-red-600'
    return 'text-muted-foreground'
  }

  const formatTime = (timestamp: number, timeFormat: TransactionSettings['timeFormat']) => {
    if (timeFormat === 'relative') {
      return dayjs.unix(timestamp).fromNow()
    }
    return dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')
  }

  return (
    <Tabs
      value={settings.activeTab}
      onValueChange={value => setSettings(prev => ({ ...prev, activeTab: value as '0' | '1' }))}
      className="w-full"
    >
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="0">
            交易视图
            <Badge variant="secondary" className="flex items-center justify-center rounded-full bg-muted-foreground/30">
              {filteredTransactions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="1">
            代币视图
            <Badge variant="secondary" className="flex items-center justify-center rounded-full bg-muted-foreground/30">
              {tokens.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {settings.activeTab === '0' && (
          <div className="flex items-center">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>
                  <Filter className="h-4 w-4" />
                  <span className="ml-1">{filterTitle()}</span>
                </MenubarTrigger>
                <MenubarContent align="center">
                  <MenubarRadioGroup
                    value={settings.filter}
                    onValueChange={value =>
                      setSettings(prev => ({ ...prev, filter: value as 'all' | 'buy' | 'sell' }))}
                  >
                    <MenubarRadioItem value="all">全部</MenubarRadioItem>
                    <MenubarRadioItem value="buy">买入</MenubarRadioItem>
                    <MenubarRadioItem value="sell">卖出</MenubarRadioItem>
                    <MenubarSeparator />
                    <MenubarCheckboxItem
                      checked={!settings.showFailed}
                      onCheckedChange={checked => setSettings(prev => ({ ...prev, showFailed: !checked }))}
                    >
                      隐藏失败交易
                    </MenubarCheckboxItem>
                  </MenubarRadioGroup>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>
          </div>
        )}
      </div>

      <TabsContent value="0">
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>交易哈希</TableHead>
                  <TableHead className="flex items-center">
                    时间
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSettings(prev => ({
                          ...prev,
                          timeFormat: prev.timeFormat === 'absolute' ? 'relative' : 'absolute',
                        }))}
                      className="h-6 w-6 p-0"
                    >
                      <Clock className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>源代币</TableHead>
                  <TableHead>目标代币</TableHead>
                  <TableHead className="text-right">手续费</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          暂无交易记录
                        </TableCell>
                      </TableRow>
                    )
                  : (
                      <AnimatePresence>
                        {filteredTransactions.map((transaction, index) => (
                          <motion.tr
                            key={transaction.hash}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 > 0.1 ? 0.1 : index * 0.05 }}
                            className={cn(
                              'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                              transaction.status === 'failed' && 'bg-destructive/10 hover:bg-destructive/20',
                            )}
                          >
                            <TableCell className="font-medium">{filteredTransactions.length - index}</TableCell>
                            <TableCell className="font-medium">
                              <a
                                href={`https://bscscan.com/tx/${transaction.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center hover:text-primary"
                              >
                                {formatAddress(transaction.hash)}
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{formatTime(transaction.timestamp, settings.timeFormat)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-mono text-xs">{formatTime(transaction.timestamp, 'absolute')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-green-600 font-semibold">{transaction.from.amount}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1">
                                        <span>{transaction.from.symbol}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatAddress(transaction.from.address)}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-mono text-xs">{transaction.from.address}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-green-600 font-semibold">{transaction.to.amount}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1">
                                        <span>{transaction.to.symbol}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatAddress(transaction.to.address)}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-mono text-xs">{transaction.to.address}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {transaction.gas}
                              <span className="ml-1 text-xs text-muted-foreground">BNB</span>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="1">
        <div className="w-full overflow-hidden rounded-lg border">
          <div className="bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>代币</TableHead>
                  <TableHead>流入</TableHead>
                  <TableHead>流出</TableHead>
                  <TableHead>净流入</TableHead>
                  <TableHead className="text-right">利润</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          暂无代币记录
                        </TableCell>
                      </TableRow>
                    )
                  : (
                      <AnimatePresence>
                        {tokens.map((token, index) => (
                          <motion.tr
                            key={token.address}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                          >
                            <TableCell className="font-medium">{tokens.length - index}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{token.symbol}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground">{formatAddress(token.address)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-mono text-xs">{token.address}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell>{token.in}</TableCell>
                            <TableCell>{token.out}</TableCell>
                            <TableCell className={getValueColor(token.in - token.out)}>{token.in - token.out}</TableCell>
                            <TableCell className={`text-right ${getValueColor(token.in - token.out)}`}>
                              $
                              {getPnL(token)}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
