import SwapTransaction from '@/components/swap-transaction'
import TransactionSearch from '@/components/transaction-search'
import WalletConnect from '@/components/wallet-connect'
import WalletSelector from '@/components/wallet-selector'

export default function Home() {
  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-6">
      <div className="w-full flex items-center gap-2">
        <WalletSelector />
        <TransactionSearch />
        <WalletConnect />
      </div>
      <SwapTransaction />
    </div>
  )
}
