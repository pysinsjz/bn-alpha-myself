'use client'

import type { Hex } from 'viem'
import { Search, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { isAddress } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'

interface TransactionSearchProps {
  isLoading?: boolean
  defaultAddress?: Hex
  onSearch?: (address: Hex) => void
}

export default function TransactionSearch({
  isLoading = false,
  defaultAddress = '' as Hex,
  onSearch,
}: TransactionSearchProps) {
  const [address, setAddress] = useState(defaultAddress)
  const router = useRouter()
  const pathname = usePathname()

  const handleSearch = () => {
    if (!address.trim()) {
      toast.error('请输入钱包地址！')
      return
    }

    if (!isAddress(address)) {
      toast.error('钱包地址无效！')
      return
    }

    if (pathname === `/${address}` && onSearch) {
      onSearch(address)
      return
    }

    router.push(`/${address}`)
  }

  return (
    <div className="w-full flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          name="wallet-address"
          id="wallet-address-input"
          type="text"
          placeholder="请输入钱包地址 (0x...)"
          value={address}
          onChange={e => setAddress(e.target.value as Hex)}
          className="pr-8"
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        {address && (
          <button
            type="button"
            onClick={() => setAddress('' as Hex)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="清空输入"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button onClick={handleSearch} disabled={isLoading}>
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}
