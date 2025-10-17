import { NextRequest, NextResponse } from 'next/server'

/**
 * 取消订单接口
 * POST /api/alpha-trading/cancel-order
 */
export async function POST(request: NextRequest) {
  try {
    // 获取请求头中的认证信息
    const csrfToken = request.headers.get('x-csrf-token')
    const cookies = request.headers.get('x-cookies')

    if (!csrfToken || !cookies) {
      return NextResponse.json(
        { code: 'AUTH_ERROR', message: '缺少认证信息' },
        { status: 401 }
      )
    }

    // 获取请求体
    const body = await request.json()

    // 调用币安 API
    const response = await fetch(
      'https://www.binance.com/bapi/asset/v1/private/alpha-trade/oto-order/cancel',
      {
        method: 'POST',
        headers: {
          'clienttype': 'web',
          'csrftoken': csrfToken,
          'Cookie': cookies,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { code: 'API_ERROR', message: `币安 API 返回错误: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('取消订单失败:', error)
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: error.message || '服务器错误' },
      { status: 500 }
    )
  }
}

