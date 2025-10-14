# 实时价格功能说明

## 📊 功能概述

基于[币安 Alpha API](https://developers.binance.com/docs/zh-CN/alpha/market-data/rest-api/aggregated-trades)，实现了以下功能：

1. **实时价格显示**：每秒自动更新选中代币的最新价格
2. **自动计算预估**：根据实时价格自动计算接收金额
3. **价格变化显示**：显示 24 小时价格涨跌幅
4. **成交记录**：显示最近 10 条成交记录
5. **交易量统计**：显示 24 小时交易量

---

## 🏗️ 技术实现

### 1. 数据源

#### Alpha Token 列表
- **文件**：`constants/alpha_token.json`
- **包含**：1900+ 个币安 Alpha 代币的完整信息
- **字段**：
  - `tokenId`: 代币唯一标识
  - `alphaId`: Alpha 交易对 ID（如 ALPHA_118）
  - `contractAddress`: 合约地址
  - `symbol`: 代币符号
  - `price`: 当前价格
  - `percentChange24h`: 24h 涨跌幅
  - `volume24h`: 24h 交易量
  - 等等...

#### 币安 Alpha API
- **接口**：`/bapi/defi/v1/public/alpha-trade/agg-trades`
- **URL**：`https://www.binance.com/bapi/defi/v1/public/alpha-trade/agg-trades`
- **参数**：
  - `symbol`: 交易对符号（如 ALPHA_118USDC）
  - `limit`: 返回数量（默认 500，最大 1000）
  - `startTime`: 起始时间戳（可选）
  - `endTime`: 结束时间戳（可选）

### 2. 核心文件

#### 类型定义 (`types/alpha.ts`)
```typescript
// 币安 Alpha Token 完整信息
interface BinanceAlphaToken {
  tokenId: string
  alphaId: string
  contractAddress: Hex
  symbol: string
  price: string
  percentChange24h: string
  volume24h: string
  // ... 更多字段
}

// 聚合交易数据
interface BinanceAggTrade {
  a: number  // 聚合成交ID
  p: string  // 价格
  q: string  // 数量
  T: number  // 时间戳
  // ...
}
```

#### API 封装 (`lib/binance-api.ts`)
```typescript
// 获取所有 Alpha Token 列表
getAllAlphaTokens(): BinanceAlphaToken[]

// 根据合约地址获取代币信息
getAlphaTokenByAddress(address: string): BinanceAlphaToken | undefined

// 获取聚合交易数据
getAggTrades(symbol: string, params?): Promise<BinanceAggTrade[]>

// 获取最新价格
getLatestPrice(symbol: string): Promise<string | null>

// 构建交易对符号
buildTradingPair(alphaId: string, baseToken: string): string
```

#### 实时价格 Hook (`hooks/use-realtime-price.ts`)
```typescript
useRealtimePrice(
  tokenAddress: string | undefined,
  baseToken: string = 'USDC',
  interval: number = 1000  // 更新间隔（毫秒）
): {
  price: string | null
  priceChange24h: string | null
  volume24h: string | null
  recentTrades: BinanceAggTrade[]
  isLoading: boolean
  error: string | null
}
```

### 3. 使用示例

```typescript
// 在组件中使用
const realtimePrice = useRealtimePrice(
  toToken,           // 目标代币地址
  'USDC',            // 基础代币
  1000               // 每秒更新
)

// 获取价格
console.log(realtimePrice.price)

// 获取涨跌幅
console.log(realtimePrice.priceChange24h)

// 获取最近成交
console.log(realtimePrice.recentTrades)
```

---

## 🎯 功能详解

### 1. 实时价格显示

- **位置**：交易界面中部，接收代币选择器下方
- **内容**：
  - 当前价格（精确到 8 位小数）
  - 24h 涨跌幅（带颜色和图标）
  - 24h 交易量

```
┌─────────────────────────────────┐
│ 实时价格         $0.10263027  📈 -26.57% │
│ 24h 交易量       $13,173,943            │
└─────────────────────────────────┘
```

### 2. 自动计算预估金额

- **触发条件**：输入支付金额 或 实时价格更新
- **计算公式**：
  ```typescript
  接收金额 = 支付金额 / 实时价格
  ```
- **示例**：
  - 支付 100 USDC
  - 实时价格 $0.10263027
  - 接收预估 ≈ 974.387 LAB

### 3. 最近成交记录

- **位置**：价格信息下方
- **显示**：最近 10 条成交记录
- **内容**：时间、价格、数量
- **更新**：每秒自动刷新

```
最近成交
┌────────────────────────────────┐
│ 14:32:15  $0.10263027  125.50  │
│ 14:32:14  $0.10258931  78.32   │
│ 14:32:13  $0.10265104  201.15  │
│ ...                             │
└────────────────────────────────┘
```

---

## 🔄 数据流程

```
1. 用户选择目标代币（如 LAB）
   ↓
2. 根据合约地址查找 Alpha Token 信息
   ↓
3. 获取 alphaId（如 ALPHA_428）
   ↓
4. 构建交易对符号（ALPHA_428USDC）
   ↓
5. 每秒调用币安 API 获取最新成交数据
   ↓
6. 提取最新价格和成交记录
   ↓
7. 自动计算接收预估金额
   ↓
8. 更新 UI 显示
```

---

## ⚙️ 配置说明

### 更新间隔

在 `components/swap-transaction.tsx` 中修改：

```typescript
const realtimePrice = useRealtimePrice(
  selectedToToken ? toToken : undefined,
  selectedFromToken?.symbol || 'USDC',
  1000  // 修改这里，单位：毫秒
)
```

### 显示成交记录数量

在 `components/swap-transaction.tsx` 中修改：

```typescript
{realtimePrice.recentTrades.slice(0, 10).map(...)}
//                                      ↑ 修改这里
```

### API 请求限制

在 `lib/binance-api.ts` 中修改：

```typescript
const trades = await getAggTrades(symbol, { 
  limit: 20  // 修改这里，建议 10-50
})
```

---

## 🎨 UI 组件

### 价格信息卡片

```typescript
{selectedToToken && realtimePrice.price && (
  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
    {/* 价格和涨跌幅 */}
    <div className="flex items-center justify-between">
      <span>实时价格</span>
      <Badge variant={priceChange >= 0 ? 'default' : 'destructive'}>
        {priceChange >= 0 ? <TrendingUp /> : <TrendingDown />}
        {priceChange}%
      </Badge>
    </div>
    {/* 交易量 */}
    <div>24h 交易量: ${volume}</div>
  </div>
)}
```

### 成交记录列表

```typescript
<ScrollArea className="h-32 w-full border rounded-lg">
  {recentTrades.map(trade => (
    <div key={trade.a}>
      <span>{dayjs(trade.T).format('HH:mm:ss')}</span>
      <span>${Number(trade.p).toFixed(8)}</span>
      <span>{Number(trade.q).toFixed(2)}</span>
    </div>
  ))}
</ScrollArea>
```

---

## 📊 性能优化

### 1. 缓存策略

- 使用 `useEffect` 管理定时器
- 组件卸载时自动清理定时器
- 避免重复请求

### 2. 错误处理

```typescript
try {
  const trades = await getAggTrades(symbol, { limit: 20 })
  // 处理数据
} catch (err) {
  console.error('获取失败:', err)
  // 使用本地缓存的价格作为备份
  setPrice(alphaToken.price)
}
```

### 3. 降级方案

如果 API 请求失败：
1. 显示错误信息
2. 使用 `alpha_token.json` 中的缓存价格
3. 继续尝试下次请求

---

## 🐛 常见问题

### Q1: 价格不更新？

**可能原因**：
- 网络连接问题
- API 请求限制
- 该代币没有成交数据

**解决方案**：
- 检查浏览器控制台错误
- 查看网络请求是否成功
- 尝试切换其他代币

### Q2: 价格显示为 0 或 null？

**可能原因**：
- 该代币没有在币安 Alpha 上市
- `alpha_token.json` 中没有该代币信息
- 交易对符号构建错误

**解决方案**：
- 确认代币是否在 `alpha_token.json` 中
- 检查 `alphaId` 是否正确
- 查看 API 响应数据

### Q3: 成交记录为空？

**可能原因**：
- 该代币交易量很小，没有最近成交
- API 返回的数据为空数组

**解决方案**：
- 这是正常现象，说明该时段没有成交
- 可以增加 API 请求的 `limit` 参数
- 或者增加时间范围

### Q4: 接收预估不准确？

**说明**：
- 预估金额是基于最新成交价计算的
- 实际交易时可能有滑点和手续费
- 仅供参考，不作为实际交易依据

---

## 🔒 注意事项

1. **API 限制**：
   - 币安 API 可能有请求频率限制
   - 建议更新间隔不要小于 500ms

2. **价格准确性**：
   - 价格来自币安 Alpha 交易所
   - 可能与其他交易所有差异
   - 仅供参考

3. **网络依赖**：
   - 需要能够访问 binance.com
   - 网络不稳定可能导致价格更新延迟

4. **数据时效性**：
   - `alpha_token.json` 需要定期更新
   - 使用 `pnpm fetch` 命令更新数据

---

## 🚀 未来改进

1. **WebSocket 连接**：
   - 使用 WebSocket 代替轮询，降低延迟
   - 减少服务器压力

2. **价格图表**：
   - 添加 K 线图或折线图
   - 显示价格走势

3. **多交易对支持**：
   - 支持 USDT、WBNB 等多个基础代币
   - 自动选择最优交易对

4. **价格提醒**：
   - 设置价格提醒
   - 到达目标价格时通知用户

5. **深度数据**：
   - 显示买卖盘深度
   - 更准确的价格影响计算

---

## 📚 相关文档

- [币安 Alpha API 文档](https://developers.binance.com/docs/zh-CN/alpha/market-data/rest-api/aggregated-trades)
- 项目文档：`DOCUMENTATION.md`
- 钱包设置：`WALLET_SETUP.md`

---

## 🎉 总结

实时价格功能已经完全集成到交易界面中：

✅ **实时更新**：每秒自动获取最新价格  
✅ **自动计算**：根据实时价格预估接收金额  
✅ **成交记录**：显示最近成交，把握市场动态  
✅ **价格变化**：直观显示 24h 涨跌幅和交易量  
✅ **错误处理**：网络异常时使用缓存价格  

现在您可以在交易界面实时查看代币价格，做出更明智的交易决策！🚀

