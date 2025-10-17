/**
 * Alpha 代币列表存储管理
 */

import type { BinanceAlphaToken } from '@/types/alpha'

const TOKEN_LIST_STORAGE_KEY = 'binance_alpha_token_list'

export interface TokenListData {
  tokens: BinanceAlphaToken[]
  timestamp: number
  expiresAt: number
}

/**
 * 检查是否在浏览器环境中
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * 保存代币列表到 localStorage
 */
export function saveTokenList(tokens: BinanceAlphaToken[]): void {
  if (!isBrowser()) {
    console.log('非浏览器环境，跳过保存代币列表')
    return
  }

  try {
    const now = Date.now()
    const expiresAt = now + (60 * 60 * 1000) // 1小时后过期
    
    const tokenData: TokenListData = {
      tokens,
      timestamp: now,
      expiresAt,
    }
    
    localStorage.setItem(TOKEN_LIST_STORAGE_KEY, JSON.stringify(tokenData))
    console.log('代币列表已保存到本地存储，1小时后过期')
  } catch (error) {
    console.error('保存代币列表失败:', error)
  }
}

/**
 * 从 localStorage 读取代币列表
 */
export function loadTokenList(): BinanceAlphaToken[] | null {
  if (!isBrowser()) {
    console.log('非浏览器环境，无法读取代币列表')
    return null
  }

  try {
    const stored = localStorage.getItem(TOKEN_LIST_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const tokenData: TokenListData = JSON.parse(stored)
    const now = Date.now()
    
    // 检查是否过期
    if (now > tokenData.expiresAt) {
      console.log('代币列表已过期，清除存储')
      clearTokenList()
      return null
    }

    console.log('从本地存储加载代币列表')
    return tokenData.tokens
  } catch (error) {
    console.error('读取代币列表失败:', error)
    clearTokenList()
    return null
  }
}

/**
 * 清除代币列表存储
 */
export function clearTokenList(): void {
  if (!isBrowser()) {
    console.log('非浏览器环境，跳过清除代币列表存储')
    return
  }

  try {
    localStorage.removeItem(TOKEN_LIST_STORAGE_KEY)
    console.log('代币列表存储已清除')
  } catch (error) {
    console.error('清除代币列表存储失败:', error)
  }
}

/**
 * 检查代币列表是否存在且有效
 */
export function isTokenListValid(): boolean {
  if (!isBrowser()) {
    return false
  }
  
  const tokens = loadTokenList()
  return tokens !== null && tokens.length > 0
}

/**
 * 获取代币列表的剩余有效时间（毫秒）
 */
export function getTokenListRemainingTime(): number {
  if (!isBrowser()) {
    return 0
  }

  try {
    const stored = localStorage.getItem(TOKEN_LIST_STORAGE_KEY)
    if (!stored) {
      return 0
    }

    const tokenData: TokenListData = JSON.parse(stored)
    const now = Date.now()
    
    return Math.max(0, tokenData.expiresAt - now)
  } catch (error) {
    return 0
  }
}

/**
 * 格式化剩余时间显示
 */
export function formatTokenListRemainingTime(ms: number): string {
  if (ms <= 0) {
    return '已过期'
  }

  const minutes = Math.floor(ms / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)

  if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}
