import type { ClassValue } from 'clsx'
import type { Hex } from 'viem'
import type { NormalTransaction } from '@/types'
import { clsx } from 'clsx'
import c from 'picocolors'
import { twMerge } from 'tailwind-merge'
import {
  isAddressEqual as _isAddressEqual,
  createPublicClient,
  decodeFunctionData,
  ethAddress,
  formatUnits,
  getContract,
  http,
  isAddress,
  zeroAddress,
} from 'viem'
import { bsc } from 'viem/chains'
import { USD1_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, WBNB_ADDRESS } from '@/constants'
import { ERC20_ABI } from '@/constants/abis'
import alphaTokens from '@/constants/tokens'
import dayjs from '@/lib/dayjs'
import { SWAP_ROUTES } from '../constants/routes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string): string {
  if (!address)
    return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function isAddressEqual(a: Hex, b: Hex): boolean {
  if (!isAddress(a) || !isAddress(b))
    return false
  return _isAddressEqual(a, b)
}

export function getRandomElementFromArray<T>(array: readonly T[], count?: 1): T
export function getRandomElementFromArray<T>(array: readonly T[], count: number): T[]
export function getRandomElementFromArray<T>(array: readonly T[], count = 1): T | T[] {
  if (!array.length || count > array.length)
    return array?.length === 1 ? array[0] : [...array]

  const shuffled = [...array].sort(() => Math.random() - 0.5)
  const result = shuffled.slice(0, Math.max(1, Math.floor(count)))

  return result.length === 1 ? result[0] : result
}

export function getValueByPath<T = unknown>(data: any, path: Array<string | number>): T | undefined {
  return path.reduce((acc: any, key: string | number) => {
    if (acc === undefined || acc === null)
      return undefined
    if (Array.isArray(acc) || (typeof key === 'number' && acc.length !== undefined)) {
      return acc[key as number]
    }
    if (typeof acc === 'object' && acc !== null) {
      return acc[key as string]
    }
    return undefined
  }, data)
}

export function getPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http('https://bsc.blockrazor.xyz'),
  })
}

export function getDynamicTimeRange() {
  const now = dayjs.tz(undefined, 'Asia/Shanghai')
  const isBefore8AM = now.hour() < 8
  const baseDay = isBefore8AM ? now.subtract(1, 'day') : now
  return [baseDay.set('hour', 8).startOf('hour'), baseDay.add(1, 'day').set('hour', 7).endOf('hour')]
}

export function isNativeToken(address: Hex) {
  return isAddressEqual(address, ethAddress) || isAddressEqual(address, zeroAddress)
}

export function isValidSourceToken(address: Hex) {
  return (
    isNativeToken(address)
    || isAddressEqual(address, USDT_ADDRESS)
    || isAddressEqual(address, USDC_ADDRESS)
    || isAddressEqual(address, USD1_ADDRESS)
    || isAddressEqual(address, WBNB_ADDRESS)
  )
}

export async function getTokenInfo(address: Hex) {
  if (isNativeToken(address)) {
    return {
      symbol: 'BNB',
      decimals: 18,
    }
  }
  if (isAddressEqual(address, USDT_ADDRESS)) {
    return {
      symbol: 'USDT',
      decimals: 18,
    }
  }
  if (isAddressEqual(address, USDC_ADDRESS)) {
    return {
      symbol: 'USDC',
      decimals: 18,
    }
  }
  if (isAddressEqual(address, WBNB_ADDRESS)) {
    return {
      symbol: 'WBNB',
      decimals: 18,
    }
  }
  const token = alphaTokens.find(token => isAddressEqual(token.contractAddress, address))
  if (token) {
    return {
      symbol: token.symbol,
      decimals: token.decimals,
    }
  }
  const client = getPublicClient()
  const contract = getContract({
    abi: ERC20_ABI,
    address,
    client,
  })
  const [symbol, decimals] = await Promise.all([contract.read.symbol(), contract.read.decimals()])
  return { symbol, decimals }
}

export async function getSwapInfo(tx: NormalTransaction) {
  const { hash, methodId, input } = tx
  const swapRoute = SWAP_ROUTES.find(route => input.startsWith(route.method))
  if (!swapRoute) {
    throw new Error(`Unsupported swap route: [${methodId}](${hash}) `)
  }
  const { amountPath, fromTokenPath, toTokenPath, abi } = swapRoute
  const { args } = decodeFunctionData({
    abi,
    data: input,
  })
  const fromTokenAmount = getValueByPath<bigint>(args, amountPath)!
  const fromTokenAddress: Hex = `0x${getValueByPath<bigint>(args, fromTokenPath)!.toString(16).padEnd(40, '0')}`
  const toTokenAddress: Hex = `0x${getValueByPath<bigint>(args, toTokenPath)!.toString(16).padEnd(40, '0')}`
  const { symbol: fromTokenSymbol, decimals: fromTokenDecimals } = await getTokenInfo(fromTokenAddress)
  const { symbol: toTokenSymbol, decimals: toTokenDecimal } = await getTokenInfo(toTokenAddress)

  return {
    from: {
      address: fromTokenAddress,
      symbol: fromTokenSymbol,
      decimals: fromTokenDecimals,
      amount: Number(formatUnits(fromTokenAmount, fromTokenDecimals)),
    },
    to: {
      address: toTokenAddress,
      symbol: toTokenSymbol,
      decimals: toTokenDecimal,
      amount: 0,
    },
  }
}

export function calculatePoints(value: number) {
  if (value < 0)
    throw new Error('Value must be non-negative')

  if (value < 2) {
    return { value, points: 0, range: [0, 2] }
  }

  const exponent = Math.floor(Math.log2(value))
  const lower = 2 ** exponent
  const upper = 2 ** (exponent + 1)

  return {
    value,
    points: exponent,
    range: [lower, upper],
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getErrorMessage(error: any) {
  const errorPaths = [
    ['response', 'data', 'message'],
    ['response', 'data', 'error'],
    ['response', 'data'],
    ['response', 'statusText'],
    ['error', 'reason'],
    ['cause'],
    ['reason'],
    ['message'],
  ]

  for (const path of errorPaths) {
    let value = error
    for (const key of path) {
      if (value === null || value === undefined)
        break
      value = value[key]
    }
    if (value) {
      return typeof value === 'object' ? JSON.stringify(value, Object.getOwnPropertyNames(value)) : String(value)
    }
  }
  return 'error'
}

export function retry<A extends unknown[], T>(fn: (...args: A) => Promise<T>, times = 0, delay = 0) {
  return (...args: A): Promise<T> =>
    new Promise((resolve, reject) => {
      const attempt = async () => {
        try {
          resolve(await fn(...args))
        }
        catch (err: any) {
          console.log(c.red(`[${fn.name || 'anonymous'}] ${getErrorMessage(err)}`))
          if (times-- <= 0) {
            reject(err)
          }
          else {
            setTimeout(attempt, delay)
          }
        }
      }
      attempt()
    })
}
