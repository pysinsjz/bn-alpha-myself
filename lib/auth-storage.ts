/**
 * 认证信息存储管理
 */

const AUTH_STORAGE_KEY = 'binance_alpha_auth'

export interface AuthInfo {
  csrfToken: string
  cookies: string
  timestamp: number
  expiresAt?: number
}

/**
 * 检查是否在浏览器环境中
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * 保存认证信息到 localStorage
 */
export function saveAuthInfo(authInfo: Omit<AuthInfo, 'timestamp'>): void {
  if (!isBrowser()) {
    console.log('非浏览器环境，跳过保存认证信息')
    return
  }

  try {
    const authData: AuthInfo = {
      ...authInfo,
      timestamp: Date.now(),
    }
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
    console.log('认证信息已保存到本地存储')
  } catch (error) {
    console.error('保存认证信息失败:', error)
  }
}

/**
 * 从 localStorage 读取认证信息
 */
export function loadAuthInfo(): AuthInfo | null {
  if (!isBrowser()) {
    console.log('非浏览器环境，无法读取认证信息')
    return null
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const authData: AuthInfo = JSON.parse(stored)
    
    // 检查是否过期（默认24小时过期）
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24小时
    const expiresAt = authData.expiresAt || (authData.timestamp + maxAge)
    
    if (now > expiresAt) {
      console.log('认证信息已过期，清除存储')
      clearAuthInfo()
      return null
    }

    console.log('从本地存储加载认证信息')
    return authData
  } catch (error) {
    console.error('读取认证信息失败:', error)
    clearAuthInfo()
    return null
  }
}

/**
 * 清除认证信息
 */
export function clearAuthInfo(): void {
  if (!isBrowser()) {
    console.log('非浏览器环境，跳过清除认证信息')
    return
  }

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    console.log('认证信息已清除')
  } catch (error) {
    console.error('清除认证信息失败:', error)
  }
}

/**
 * 检查认证信息是否存在且有效
 */
export function isAuthValid(): boolean {
  if (!isBrowser()) {
    return false
  }
  
  const authInfo = loadAuthInfo()
  return authInfo !== null
}

/**
 * 获取认证信息的剩余有效时间（毫秒）
 */
export function getAuthRemainingTime(): number {
  if (!isBrowser()) {
    return 0
  }

  const authInfo = loadAuthInfo()
  if (!authInfo) {
    return 0
  }

  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24小时
  const expiresAt = authInfo.expiresAt || (authInfo.timestamp + maxAge)
  
  return Math.max(0, expiresAt - now)
}

/**
 * 格式化剩余时间显示
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) {
    return '已过期'
  }

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

/**
 * 从 curl 请求中提取认证信息并保存
 */
export function extractAndSaveAuthFromCurl(curlString: string): { success: boolean; error?: string } {
  try {
    // 提取 csrftoken
    const csrfMatch = curlString.match(/--header 'csrftoken: ([^']+)'/)
    const csrfToken = csrfMatch ? csrfMatch[1] : ''

    // 提取 Cookie
    const cookieMatch = curlString.match(/--header 'Cookie: ([^']+)'/)
    const cookies = cookieMatch ? cookieMatch[1] : ''

    if (!csrfToken || !cookies) {
      return {
        success: false,
        error: '无法从 curl 请求中提取有效的认证信息'
      }
    }

    // 保存认证信息
    saveAuthInfo({
      csrfToken,
      cookies,
    })

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: `解析 curl 请求失败: ${error.message}`
    }
  }
}
