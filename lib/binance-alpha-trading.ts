import type { BinanceAlphaToken } from '@/types/alpha'

/**
 * 币安 Alpha 交易接口类型定义
 */

// 支付方式类型
export type PaymentWalletType = 'CARD' | 'BALANCE' | 'BANK'

// 交易方向
export type WorkingSide = 'BUY' | 'SELL'

// 支付详情
export interface PaymentDetails {
  amount: string
  paymentWalletType: PaymentWalletType
}

// 下单请求参数
export interface PlaceOrderRequest {
  baseAsset: string // Alpha 代币 ID，如 "ALPHA_382"
  quoteAsset: string // 基础代币，如 "USDT"
  workingSide: WorkingSide // 交易方向：BUY 或 SELL
  workingPrice: number // 挂单价格
  workingQuantity: number // 挂单数量
  paymentDetails: PaymentDetails[] // 支付详情
  pendingPrice?: number // 待定价格（可选）
}

// 下单响应
export interface PlaceOrderResponse {
  code: string
  message: string | null
  messageDetail: string | null
  data: {
    orderId: string
    status: string
    baseAsset: string
    quoteAsset: string
    workingSide: WorkingSide
    workingPrice: number
    workingQuantity: number
    executedQuantity: number
    executedPrice: number
    createTime: number
    updateTime: number
  }
}

// 订单查询参数
export interface QueryOrdersRequest {
  baseAsset?: string
  quoteAsset?: string
  workingSide?: WorkingSide
  status?: string
  startTime?: number
  endTime?: number
  limit?: number
  page?: number
}

// 订单信息
export interface OrderInfo {
  orderId: string
  status: string
  baseAsset: string
  quoteAsset: string
  workingSide: WorkingSide
  workingPrice: number
  workingQuantity: number
  executedQuantity: number
  executedPrice: number
  createTime: number
  updateTime: number
}

// 订单查询响应
export interface QueryOrdersResponse {
  code: string
  message: string | null
  messageDetail: string | null
  data: {
    orders: OrderInfo[]
    total: number
    page: number
    limit: number
  }
}

// 取消订单请求
export interface CancelOrderRequest {
  orderId: string
}

// 取消订单响应
export interface CancelOrderResponse {
  code: string
  message: string | null
  messageDetail: string | null
  data: {
    orderId: string
    status: string
  }
}

/**
 * 币安 Alpha 交易服务类
 */
export class BinanceAlphaTradingService {
  private baseUrl = 'https://www.binance.com/bapi/asset/v1/private/alpha-trade'
  private csrfToken: string
  private cookies: string

  constructor(csrfToken: string, cookies: string) {
    this.csrfToken = csrfToken
    this.cookies = cookies
  }

  /**
   * 设置认证信息
   */
  setAuth(csrfToken: string, cookies: string) {
    this.csrfToken = csrfToken
    this.cookies = cookies
  }

  /**
   * 获取请求头
   */
  private getHeaders() {
    return {
      'clienttype': 'web',
      'csrftoken': this.csrfToken,
      'Cookie': this.cookies,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 构建 Alpha 代币 ID
   * @param token 代币信息
   * @returns Alpha 代币 ID，如 "ALPHA_382"
   */
  buildAlphaId(token: BinanceAlphaToken): string {
    return token.alphaId || `ALPHA_${token.tokenId}`
  }

  /**
   * 挂买单
   * @param params 下单参数
   */
  async placeBuyOrder(params: {
    token: BinanceAlphaToken
    quoteAsset: string
    price: number
    quantity: number
    paymentAmount: number
    paymentType?: PaymentWalletType
  }): Promise<PlaceOrderResponse> {
    const alphaId = this.buildAlphaId(params.token)
    
    const request: PlaceOrderRequest = {
      baseAsset: alphaId,
      quoteAsset: params.quoteAsset,
      workingSide: 'BUY',
      workingPrice: params.price,
      workingQuantity: params.quantity,
      paymentDetails: [{
        amount: params.paymentAmount.toString(),
        paymentWalletType: params.paymentType || 'BALANCE'
      }],
      pendingPrice: params.price
    }

    return this.placeOrder(request)
  }

  /**
   * 挂卖单
   * @param params 下单参数
   */
  async placeSellOrder(params: {
    token: BinanceAlphaToken
    quoteAsset: string
    price: number
    quantity: number
  }): Promise<PlaceOrderResponse> {
    const alphaId = this.buildAlphaId(params.token)
    
    const request: PlaceOrderRequest = {
      baseAsset: alphaId,
      quoteAsset: params.quoteAsset,
      workingSide: 'SELL',
      workingPrice: params.price,
      workingQuantity: params.quantity,
      paymentDetails: [{
        amount: (params.price * params.quantity).toString(),
        paymentWalletType: 'BALANCE'
      }],
      pendingPrice: params.price
    }

    return this.placeOrder(request)
  }

  /**
   * 下单
   * @param request 下单请求
   */
  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/oto-order/place`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`下单失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code !== '000000') {
        throw new Error(`下单失败: ${data.message || '未知错误'}`)
      }

      return data
    } catch (error) {
      console.error('下单失败:', error)
      throw error
    }
  }

  /**
   * 查询订单
   * @param params 查询参数
   */
  async queryOrders(params: QueryOrdersRequest = {}): Promise<QueryOrdersResponse> {
    try {
      const url = new URL(`${this.baseUrl}/oto-order/list`)
      
      // 添加查询参数
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`查询订单失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code !== '000000') {
        throw new Error(`查询订单失败: ${data.message || '未知错误'}`)
      }

      return data
    } catch (error) {
      console.error('查询订单失败:', error)
      throw error
    }
  }

  /**
   * 取消订单
   * @param orderId 订单ID
   */
  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    try {
      const request: CancelOrderRequest = { orderId }

      const response = await fetch(`${this.baseUrl}/oto-order/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`取消订单失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code !== '000000') {
        throw new Error(`取消订单失败: ${data.message || '未知错误'}`)
      }

      return data
    } catch (error) {
      console.error('取消订单失败:', error)
      throw error
    }
  }

  /**
   * 获取订单详情
   * @param orderId 订单ID
   */
  async getOrderDetail(orderId: string): Promise<OrderInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/oto-order/detail?orderId=${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`获取订单详情失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code !== '000000') {
        throw new Error(`获取订单详情失败: ${data.message || '未知错误'}`)
      }

      return data.data
    } catch (error) {
      console.error('获取订单详情失败:', error)
      throw error
    }
  }

  /**
   * 获取账户余额
   */
  async getAccountBalance(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/account/balance`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`获取账户余额失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code !== '000000') {
        throw new Error(`获取账户余额失败: ${data.message || '未知错误'}`)
      }

      return data.data
    } catch (error) {
      console.error('获取账户余额失败:', error)
      throw error
    }
  }
}

/**
 * 创建币安 Alpha 交易服务实例
 * @param csrfToken CSRF Token
 * @param cookies Cookie 字符串
 */
export function createBinanceAlphaTradingService(csrfToken: string, cookies: string): BinanceAlphaTradingService {
  return new BinanceAlphaTradingService(csrfToken, cookies)
}

/**
 * 从 curl 请求中提取认证信息
 * @param curlString curl 请求字符串
 */
export function extractAuthFromCurl(curlString: string): { csrfToken: string; cookies: string } {
  // 提取 csrftoken
  const csrfMatch = curlString.match(/--header 'csrftoken: ([^']+)'/)
  const csrfToken = csrfMatch ? csrfMatch[1] : ''

  // 提取 Cookie
  const cookieMatch = curlString.match(/--header 'Cookie: ([^']+)'/)
  const cookies = cookieMatch ? cookieMatch[1] : ''

  return { csrfToken, cookies }
}

/**
 * 解析 curl 请求中的订单参数
 * @param curlString curl 请求字符串
 */
export function parseOrderFromCurl(curlString: string): Partial<PlaceOrderRequest> {
  // 提取 JSON 数据部分
  const jsonMatch = curlString.match(/--data '([^']+)'/)
  if (!jsonMatch) {
    throw new Error('无法从 curl 请求中提取 JSON 数据')
  }

  try {
    const orderData = JSON.parse(jsonMatch[1])
    return orderData
  } catch (error) {
    throw new Error('解析 JSON 数据失败')
  }
}
