import SwapTransaction from '@/components/swap-transaction'
import TransactionSearch from '@/components/transaction-search'
import WalletConnect from '@/components/wallet-connect'
import WalletSelector from '@/components/wallet-selector'
import BinanceAlphaTrading from '@/components/binance-alpha-trading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <div className="w-full max-w-6xl flex flex-col items-center gap-6">
      <div className="w-full flex items-center gap-2">
        <WalletSelector />
        <TransactionSearch />
        <WalletConnect />
      </div>
      
      <Tabs defaultValue="alpha" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="swap">DEX 交易</TabsTrigger>
          <TabsTrigger value="alpha">Alpha 交易</TabsTrigger>
        </TabsList>
        
        <TabsContent value="swap" className="mt-6">
          <SwapTransaction />
        </TabsContent>
        
        <TabsContent value="alpha" className="mt-6">
          <BinanceAlphaTrading />
        </TabsContent>
      </Tabs>
    </div>
  )
}
