# 币安 Alpha 交易功能

本项目已集成币安 Alpha 交易接口，支持挂买单和卖单功能。

## 功能特性

- ✅ 支持挂买单和卖单
- ✅ 订单管理（查询、取消订单）
- ✅ 账户余额查询
- ✅ 实时订单状态更新
- ✅ 多种支付方式支持
- ✅ 完整的错误处理

## 使用方法

### 1. 获取认证信息

首先需要从币安 Alpha 交易页面获取认证信息：

1. 打开币安 Alpha 交易页面
2. 打开浏览器开发者工具 (F12)
3. 切换到 Network 标签
4. 进行一次交易操作（挂单）
5. 找到 `oto-order/place` 请求
6. 右键点击请求，选择 "Copy as cURL"
7. 复制完整的 curl 请求

### 2. 设置认证

1. 在应用中选择 "Alpha 交易" 标签
2. 点击 "设置认证信息"
3. 粘贴完整的 curl 请求
4. 点击 "确认认证"

### 3. 进行交易

#### 挂买单
1. 选择要购买的 Alpha 代币
2. 选择基础代币（USDT/USDC/BNB）
3. 输入挂单价格
4. 输入购买数量
5. 输入支付金额
6. 选择支付方式（余额/银行卡/银行转账）
7. 点击 "挂买单"

#### 挂卖单
1. 选择要出售的 Alpha 代币
2. 选择基础代币（USDT/USDC/BNB）
3. 输入挂单价格
4. 输入出售数量
5. 点击 "挂卖单"

### 4. 订单管理

- **查看订单**：在订单管理面板查看所有订单
- **取消订单**：点击订单右侧的取消按钮
- **刷新订单**：点击刷新按钮更新订单状态

## API 接口说明

### 核心服务类

```typescript
import { BinanceAlphaTradingService } from '@/lib/binance-alpha-trading'

const service = new BinanceAlphaTradingService(csrfToken, cookies)
```

### 主要方法

#### 挂买单
```typescript
await service.placeBuyOrder({
  token: alphaToken,
  quoteAsset: 'USDT',
  price: 0.07,
  quantity: 14.28,
  paymentAmount: 1,
  paymentType: 'BALANCE'
})
```

#### 挂卖单
```typescript
await service.placeSellOrder({
  token: alphaToken,
  quoteAsset: 'USDT',
  price: 0.07,
  quantity: 14.28
})
```

#### 查询订单
```typescript
const orders = await service.queryOrders({
  baseAsset: 'ALPHA_382',
  status: 'PENDING',
  limit: 20
})
```

#### 取消订单
```typescript
await service.cancelOrder('orderId')
```

### React Hook 使用

```typescript
import { useBinanceAlphaTrading } from '@/hooks/use-binance-alpha-trading'

function TradingComponent() {
  const {
    isAuthenticated,
    isLoading,
    error,
    setAuthFromCurl,
    placeBuyOrder,
    placeSellOrder,
    queryOrders,
    cancelOrder
  } = useBinanceAlphaTrading()

  // 使用交易功能...
}
```

## 请求格式

### 下单请求示例

```json
{
  "baseAsset": "ALPHA_382",
  "quoteAsset": "USDT",
  "workingSide": "BUY",
  "workingPrice": 0.07,
  "workingQuantity": 14.28,
  "paymentDetails": [
    {
      "amount": "1",
      "paymentWalletType": "CARD"
    }
  ],
  "pendingPrice": 0.07
}
```

### 响应格式

```json
{
  "code": "000000",
  "message": null,
  "messageDetail": null,
  "data": {
    "orderId": "123456789",
    "status": "PENDING",
    "baseAsset": "ALPHA_382",
    "quoteAsset": "USDT",
    "workingSide": "BUY",
    "workingPrice": 0.07,
    "workingQuantity": 14.28,
    "executedQuantity": 0,
    "executedPrice": 0,
    "createTime": 1649671184472,
    "updateTime": 1649671184472
  }
}
```

## 注意事项

1. **认证信息**：CSRF Token 和 Cookie 有时效性，需要定期更新
2. **网络环境**：确保网络可以访问币安 API
3. **交易风险**：Alpha 代币流动性较低，请谨慎交易
4. **金额限制**：注意最小交易金额和精度要求
5. **订单状态**：订单状态包括 PENDING、FILLED、CANCELLED 等

## 错误处理

常见错误及解决方案：

- **认证失败**：检查 CSRF Token 和 Cookie 是否有效
- **下单失败**：检查余额是否充足，价格和数量是否合理
- **网络错误**：检查网络连接和 API 可用性
- **参数错误**：检查代币地址、价格精度等参数

## 安全建议

1. 不要在代码中硬编码认证信息
2. 定期更新认证信息
3. 使用环境变量存储敏感信息
4. 在生产环境中添加额外的安全验证

## 扩展功能

可以进一步扩展的功能：

- 批量下单
- 条件单（止盈止损）
- 交易历史分析
- 价格提醒
- 自动交易策略
