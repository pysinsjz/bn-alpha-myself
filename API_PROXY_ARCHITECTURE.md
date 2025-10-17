# API 代理架构说明

## 问题背景

在浏览器中直接调用币安 Alpha 交易 API 会遇到 CORS（跨域资源共享）问题，导致请求被浏览器拦截。

## 解决方案

通过 Next.js API Routes 创建服务端代理，在后端调用币安 API，避免跨域问题。

## 架构设计

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   浏览器    │ --> │ Next.js API     │ --> │  币安 API      │
│   前端组件  │     │ Routes (代理)   │     │  (无跨域限制)  │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

### 优势

1. ✅ **解决跨域问题** - 服务端调用无跨域限制
2. ✅ **保护认证信息** - Cookie 和 CSRF Token 不暴露在浏览器网络请求中
3. ✅ **统一错误处理** - 在服务端统一处理错误和异常
4. ✅ **便于扩展** - 可以添加日志、限流、缓存等功能

## API 端点

所有 API 端点都在 `/app/api/alpha-trading/` 目录下：

### 1. 下单 - `/api/alpha-trading/place-order`

**方法**: `POST`

**请求头**:
```json
{
  "Content-Type": "application/json",
  "x-csrf-token": "your-csrf-token",
  "x-cookies": "your-cookies"
}
```

**请求体**:
```json
{
  "baseAsset": "ALPHA_382",
  "quoteAsset": "USDT",
  "workingSide": "BUY",
  "workingPrice": 0.001,
  "workingQuantity": 1000,
  "paymentDetails": [{
    "amount": "100",
    "paymentWalletType": "BALANCE"
  }],
  "pendingPrice": 0.001
}
```

### 2. 查询订单 - `/api/alpha-trading/query-orders`

**方法**: `GET`

**请求头**: 同上

**查询参数** (可选):
- `baseAsset`: 基础资产
- `quoteAsset`: 报价资产
- `workingSide`: BUY | SELL
- `status`: 订单状态
- `startTime`: 开始时间
- `endTime`: 结束时间
- `limit`: 数量限制
- `page`: 页码

### 3. 取消订单 - `/api/alpha-trading/cancel-order`

**方法**: `POST`

**请求头**: 同上

**请求体**:
```json
{
  "orderId": "order-id-here"
}
```

### 4. 获取订单详情 - `/api/alpha-trading/order-detail`

**方法**: `GET`

**请求头**: 同上

**查询参数**:
- `orderId`: 订单 ID (必填)

### 5. 获取账户余额 - `/api/alpha-trading/account-balance`

**方法**: `GET`

**请求头**: 同上

## 前端使用

前端代码**无需修改**！`BinanceAlphaTradingService` 类已经自动切换到使用服务端 API。

```typescript
import { createBinanceAlphaTradingService } from '@/lib/binance-alpha-trading'

// 创建服务实例
const service = createBinanceAlphaTradingService(csrfToken, cookies)

// 使用方法保持不变
await service.placeBuyOrder({
  token: alphaToken,
  quoteAsset: 'USDT',
  price: 0.001,
  quantity: 1000,
  paymentAmount: 100,
})
```

## 认证信息传递

### 前端 → 服务端

使用自定义 HTTP 请求头传递认证信息：
- `x-csrf-token`: CSRF Token
- `x-cookies`: Cookie 字符串

### 服务端 → 币安 API

服务端将认证信息转换为币安 API 需要的格式：
```javascript
{
  'clienttype': 'web',
  'csrftoken': csrfToken,
  'Cookie': cookies,
  'Content-Type': 'application/json',
}
```

## 错误处理

### 认证错误 (401)
```json
{
  "code": "AUTH_ERROR",
  "message": "缺少认证信息"
}
```

### 参数错误 (400)
```json
{
  "code": "PARAM_ERROR",
  "message": "缺少必要参数"
}
```

### API 错误 (4xx/5xx)
```json
{
  "code": "API_ERROR",
  "message": "币安 API 返回错误: ..."
}
```

### 服务器错误 (500)
```json
{
  "code": "SERVER_ERROR",
  "message": "服务器内部错误"
}
```

## 安全性考虑

1. **认证信息保护**
   - CSRF Token 和 Cookie 通过自定义 header 传递
   - 不会暴露在 URL 或浏览器开发者工具中

2. **请求验证**
   - 服务端验证所有必填参数
   - 检查认证信息的有效性

3. **错误信息脱敏**
   - 服务端统一处理错误
   - 不向前端暴露敏感信息

## 性能优化建议

### 1. 添加缓存

对于订单列表等查询接口，可以添加短期缓存：

```typescript
// app/api/alpha-trading/query-orders/route.ts
import { NextRequest, NextResponse } from 'next/server'

// 简单内存缓存（生产环境建议使用 Redis）
const cache = new Map<string, { data: any; expiry: number }>()

export async function GET(request: NextRequest) {
  const cacheKey = `query-orders-${request.url}`
  const cached = cache.get(cacheKey)
  
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data)
  }
  
  // ... 调用币安 API
  
  // 缓存 5 秒
  cache.set(cacheKey, { data, expiry: Date.now() + 5000 })
  return NextResponse.json(data)
}
```

### 2. 添加限流

防止 API 滥用：

```typescript
// 使用 rate-limiter-flexible 或其他限流库
import { RateLimiterMemory } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 次请求
  duration: 1, // 每秒
})

export async function POST(request: NextRequest) {
  try {
    await rateLimiter.consume(request.ip || 'default')
  } catch {
    return NextResponse.json(
      { code: 'RATE_LIMIT', message: '请求过于频繁' },
      { status: 429 }
    )
  }
  
  // ... 继续处理请求
}
```

### 3. 添加请求日志

记录所有 API 调用，便于调试和监控：

```typescript
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log(`[API] ${request.method} ${request.url}`)
  
  // ... 处理请求
  
  const duration = Date.now() - startTime
  console.log(`[API] 完成，耗时 ${duration}ms`)
  
  return response
}
```

## 测试

### 使用 curl 测试

```bash
# 下单
curl -X POST http://localhost:3000/api/alpha-trading/place-order \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: your-csrf-token" \
  -H "x-cookies: your-cookies" \
  -d '{
    "baseAsset": "ALPHA_382",
    "quoteAsset": "USDT",
    "workingSide": "BUY",
    "workingPrice": 0.001,
    "workingQuantity": 1000,
    "paymentDetails": [{"amount": "100", "paymentWalletType": "BALANCE"}]
  }'

# 查询订单
curl -X GET "http://localhost:3000/api/alpha-trading/query-orders?limit=10" \
  -H "x-csrf-token: your-csrf-token" \
  -H "x-cookies: your-cookies"
```

## 部署注意事项

1. **环境变量**
   - 可以将币安 API 的 base URL 配置为环境变量
   - 便于在不同环境切换

2. **HTTPS**
   - 生产环境必须使用 HTTPS
   - 保护认证信息传输安全

3. **日志**
   - 添加完整的日志记录
   - 使用日志聚合工具（如 Sentry、DataDog）

4. **监控**
   - 监控 API 响应时间
   - 监控错误率
   - 设置告警阈值

## 文件结构

```
app/api/alpha-trading/
├── place-order/
│   └── route.ts          # 下单接口
├── query-orders/
│   └── route.ts          # 查询订单接口
├── cancel-order/
│   └── route.ts          # 取消订单接口
├── order-detail/
│   └── route.ts          # 订单详情接口
└── account-balance/
    └── route.ts          # 账户余额接口

lib/
└── binance-alpha-trading.ts  # 前端服务类（已更新为调用代理 API）
```

## 总结

通过服务端代理架构，我们成功解决了跨域问题，同时提高了应用的安全性和可维护性。前端代码无需修改，透明地使用新的架构。

