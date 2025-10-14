import type { Hex } from 'viem'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { ERC20_ABI } from '@/constants/abis'
import { WBNB_ADDRESS } from '@/constants'
import { isAddressEqual } from '@/lib/utils'

/**
 * 获取代币余额的 Hook
 * @param tokenAddress 代币合约地址
 * @param decimals 代币精度
 * @returns 格式化的余额和原始余额
 */
export function useTokenBalance(tokenAddress: Hex | undefined, decimals: number = 18) {
  const { address: walletAddress, isConnected } = useAccount()

  // 检查是否是原生 BNB (WBNB 也视为原生代币)
  const isNativeToken = tokenAddress && isAddressEqual(tokenAddress, WBNB_ADDRESS)

  // 获取原生 BNB 余额
  const {
    data: nativeBalance,
    isLoading: isNativeLoading,
    refetch: refetchNative,
  } = useBalance({
    address: walletAddress,
    query: {
      enabled: isConnected && !!walletAddress && isNativeToken,
    },
  })

  // 获取 ERC20 代币余额
  const {
    data: erc20Balance,
    isLoading: isErc20Loading,
    refetch: refetchErc20,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: isConnected && !!walletAddress && !!tokenAddress && !isNativeToken,
    },
  })

  // 统一处理余额
  const isLoading = isNativeToken ? isNativeLoading : isErc20Loading
  const refetch = isNativeToken ? refetchNative : refetchErc20

  let balance = '0'
  let formatted = '0'

  if (isNativeToken && nativeBalance) {
    balance = nativeBalance.value.toString()
    formatted = nativeBalance.formatted
  }
  else if (!isNativeToken && erc20Balance) {
    balance = erc20Balance.toString()
    formatted = formatUnits(erc20Balance as bigint, decimals)
  }

  return {
    balance, // 原始余额（wei/最小单位）
    formatted, // 格式化余额
    isLoading,
    refetch,
    isConnected,
  }
}

