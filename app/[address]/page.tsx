'use client'

import type { Hex } from 'viem'
import { AlertCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { use } from 'react'
import TransactionSearch from '@/components/transaction-search'
import TransactionTable from '@/components/transaction-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import WalletOverview from '@/components/wallet-overview'
import WalletSelector from '@/components/wallet-selector'
import { useBlockNumber } from '@/hooks/use-block'
import { useTransaction } from '@/hooks/use-transaction'
import dayjs from '@/lib/dayjs'
import { getDynamicTimeRange, isAddressEqual } from '@/lib/utils'

export default function TransactionPage({ params }: { params: Promise<{ address: Hex }> }) {
  const { address } = use(params)
  const today = dayjs(getDynamicTimeRange()[0]).unix()
  const { data: blockNumber } = useBlockNumber(today)
  const {
    data: { transactions = [], tokens = [] } = {},
    isFetching,
    error,
    isError,
    refetch,
  } = useTransaction(address, blockNumber)

  const handleSearch = (searchAddress: Hex) => {
    if (isAddressEqual(searchAddress, address)) {
      refetch()
    }
  }

  return (
    <>
      <div className="w-full max-w-5xl flex items-center gap-2">
        <WalletSelector />
        <TransactionSearch isLoading={isFetching} defaultAddress={address} onSearch={handleSearch} />
      </div>
      <div className="w-full max-w-5xl">
        <WalletOverview data={{ address, transactions, tokens }} isLoading={isFetching} />
      </div>
      <div className="w-full max-w-5xl">
        <TransactionTable data={{ transactions, tokens }} isLoading={isFetching} />
      </div>

      {isError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : '获取交易数据时发生错误，请稍后再试。'}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </>
  )
}
