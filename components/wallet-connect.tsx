'use client'

import type { Hex } from 'viem'
import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAddress } from '@/lib/utils'
import { CheckCheck, Copy, LogOut, Wallet } from 'lucide-react'

export default function WalletConnect() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {isConnected && address
        ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden md:inline">{formatAddress(address)}</span>
                {copied
                  ? (
                      <CheckCheck className="h-4 w-4 animate-bounce" />
                    )
                  : (
                      <Copy className="h-4 w-4" />
                    )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => disconnect()}
                title="断开连接"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )
        : (
            <Button onClick={() => setIsOpen(true)} variant="default">
              <Wallet className="h-4 w-4" />
              <span className="hidden md:inline ml-2">连接钱包</span>
            </Button>
          )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>连接钱包</DialogTitle>
            <DialogDescription>
              选择一个钱包来连接到 Binance Alpha
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {connectors.map((connector) => {
              const isMetaMask = connector.id === 'metaMask' || connector.id === 'io.metamask'
              const isWalletConnect = connector.id === 'walletConnect'
              const isCoinbase = connector.id === 'coinbaseWallet' || connector.id === 'coinbaseWalletSDK'
              const isInjected = connector.id === 'injected'

              let name = connector.name
              if (isMetaMask)
                name = 'MetaMask'
              else if (isWalletConnect)
                name = 'WalletConnect'
              else if (isCoinbase)
                name = 'Coinbase Wallet'
              else if (isInjected)
                name = '浏览器钱包'

              return (
                <Button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector })
                    setIsOpen(false)
                  }}
                  disabled={isPending}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isMetaMask && '使用 MetaMask 钱包'}
                        {isWalletConnect && '使用 WalletConnect 协议'}
                        {isCoinbase && '使用 Coinbase 钱包'}
                        {isInjected && !isMetaMask && '使用浏览器内置钱包'}
                      </span>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

