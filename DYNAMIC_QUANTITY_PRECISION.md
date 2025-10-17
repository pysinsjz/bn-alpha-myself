# 动态数量精度规则文档

## 更新日期
2025-10-17

## 更新历史
- **2025-10-17 初版**: 改为根据价格动态计算数量精度
- **2025-10-17 v2**: 数量矫正后自动重新计算支付金额
- **2025-10-17 v3**: 简化逻辑，数量矫正后直接使用重新计算的支付金额，不再进行额外验证

## 背景

之前的实现使用代币的 `tradeDecimal` 或 `decimals` 字段来控制交易数量精度，但这样的方式不够灵活。现在改为**根据价格动态计算数量精度**。

## 新的精度规则

### 规则定义

```typescript
/**
 * 根据价格计算数量精度
 * @param price 价格
 * @returns 数量精度
 */
function getQuantityPrecision(price: number): number {
  // 如果价格小于 0.0001，精度是 0（整数）
  // 如果价格大于等于 0.0001，精度是 4（4位小数）
  return price < 0.0001 ? 0 : price < 1 ? 2 : 4
}
```

### 精度对照表

| 价格范围 | 数量精度 | 示例 |
|---------|---------|------|
| price < 0.0001 | 0（整数） | 价格 0.00001，数量可以是 1000、2000 等 |
| price >= 0.0001 | 4（4位小数） | 价格 0.5，数量可以是 10.1234 等 |

## 实现细节

### 1. 后端实现 (`lib/binance-alpha-trading.ts`)

#### 新增方法

```typescript
/**
 * 根据价格计算数量精度
 * @param price 价格
 * @returns 数量精度
 */
private getQuantityPrecision(price: number): number {
  // 如果价格小于 0.0001，精度是 0（整数）
  // 如果价格大于等于 0.0001，精度是 4（4位小数）
  return price < 0.0001 ? 0 : price < 1 ? 2 : 4
}
```

#### placeBuyOrder 修改

```typescript
async placeBuyOrder(params: {
  token: BinanceAlphaToken
  quoteAsset: string
  price: number
  quantity: number
  paymentAmount: number
  paymentType?: PaymentWalletType
}): Promise<PlaceOrderResponse> {
  const alphaId = this.buildAlphaId(params.token)
  
  // 根据价格动态计算数量精度
  // 价格 < 0.0001 → 精度 0（整数）
  // 价格 >= 0.0001 → 精度 4（4位小数）
  const quantityPrecision = this.getQuantityPrecision(params.price)
  
  // 格式化数量到计算出的精度（四舍五入）
  const formattedQuantity = this.formatQuantity(params.quantity, quantityPrecision)
  
  // 使用格式化后的数量重新计算支付金额
  // 确保 paymentAmount 精确等于 price * quantity
  const calculatedAmount = params.price * formattedQuantity
  
  // 根据报价资产确定金额精度（USDT/USDC 是 8 位）
  const amountPrecision = params.quoteAsset === 'BNB' ? 8 : 8
  
  // 格式化金额到指定精度
  const formattedAmount = this.formatAmount(calculatedAmount, amountPrecision)
  
  console.log(`下单参数: 代币=${params.token.symbol}, 价格=${params.price}, 数量精度=${quantityPrecision}位(价格${params.price < 0.0001 ? '<' : '>='}0.0001), 原始数量=${params.quantity}, 格式化数量=${formattedQuantity}, 金额=${formattedAmount}`)
  
  const request: PlaceOrderRequest = {
    baseAsset: alphaId,
    quoteAsset: params.quoteAsset,
    workingSide: 'BUY',
    workingPrice: params.price,
    workingQuantity: formattedQuantity, // 使用格式化后的数量
    paymentDetails: [{
      amount: formattedAmount,
      paymentWalletType: params.paymentType || 'CARD'
    }],
    pendingPrice: params.price
  }

  return this.placeOrder(request)
}
```

**placeSellOrder 方法同样修改。**

#### 日志输出

新的日志格式：
```
下单参数: 代币=BANANA, 价格=0.00005, 数量精度=0位(价格<0.0001), 原始数量=100.5, 格式化数量=101, 金额=0.00505
下单参数: 代币=BANANA, 价格=0.5, 数量精度=4位(价格>=0.0001), 原始数量=100.12345, 格式化数量=100.1235, 金额=50.06175
```

### 2. 前端实现 (`components/binance-alpha-trading.tsx`)

#### 新增辅助函数

```typescript
/**
 * 根据价格计算数量精度
 * @param price 价格
 * @returns 数量精度
 */
const getQuantityPrecision = useCallback((price: number): number => {
  // 如果价格小于 0.0001，精度是 0（整数）
  // 如果价格大于等于 0.0001，精度是 4（4位小数）
  return price < 0.0001 ? 0 : 4
}, [])
```

#### 所有计算数量的地方都已更新

**1. handlePaymentAmountBlur（支付金额失焦）**
```typescript
const handlePaymentAmountBlur = useCallback(() => {
  if (paymentAmount && orderPrice && Number(paymentAmount) > 0 && Number(orderPrice) > 0) {
    const price = Number(orderPrice)
    const quantity = Number(paymentAmount) / price
    
    // 根据价格动态计算数量精度
    const quantityPrecision = getQuantityPrecision(price)
    const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))
    setOrderQuantity(formattedQuantity.toString())
    
    // 使用格式化后的数量重新计算支付金额（8位小数）
    const recalculatedAmount = (formattedQuantity * price).toFixed(8)
    const trimmedAmount = parseFloat(recalculatedAmount).toString()
    setPaymentAmount(trimmedAmount)
    
    console.log(`支付金额失焦计算: ${paymentAmount} ÷ ${price} = ${quantity}`)
    console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)`)
    console.log(`支付金额调整: ${trimmedAmount}`)
  } else if (!orderPrice || Number(orderPrice) <= 0) {
    toast.error('请先设置挂单价格')
  }
}, [paymentAmount, orderPrice, getQuantityPrecision])
```

**2. handleOrderQuantityBlur（数量失焦）**
```typescript
const handleOrderQuantityBlur = useCallback(() => {
  if (orderQuantity && orderPrice && Number(orderQuantity) > 0 && Number(orderPrice) > 0) {
    const price = Number(orderPrice)
    const quantity = Number(orderQuantity)
    
    // 根据价格动态计算数量精度
    const quantityPrecision = getQuantityPrecision(price)
    const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))
    
    // 如果格式化后的数量不同，更新显示
    if (formattedQuantity !== quantity) {
      setOrderQuantity(formattedQuantity.toString())
      console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)`)
    }
    
    // 使用格式化后的数量计算支付金额（8 位小数）
    const amount = formattedQuantity * price
    const newAmount = amount.toFixed(8)
    const trimmedAmount = parseFloat(newAmount).toString()
    setPaymentAmount(trimmedAmount)
    console.log(`挂单数量失焦计算: ${formattedQuantity} × ${price} = ${trimmedAmount}`)
  } else if (!orderPrice || Number(orderPrice) <= 0) {
    toast.error('请先设置挂单价格')
  }
}, [orderQuantity, orderPrice, getQuantityPrecision])
```

**3. handleQuickAmountSelect（快捷金额选择）**
```typescript
const handleQuickAmountSelect = useCallback((amount: number) => {
  // 确保金额精度为 8 位
  const formattedAmount = amount.toFixed(8)
  const trimmedAmount = parseFloat(formattedAmount).toString()
  setPaymentAmount(trimmedAmount)
  
  // 如果有价格，立即计算数量
  if (orderPrice && Number(orderPrice) > 0) {
    const price = Number(orderPrice)
    const quantity = amount / price
    
    // 根据价格动态计算数量精度
    const quantityPrecision = getQuantityPrecision(price)
    const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))
    setOrderQuantity(formattedQuantity.toString())
    
    toast.success(`已设置支付金额 ${trimmedAmount} ${quoteAsset}，数量 ${formattedQuantity}`)
    console.log(`快捷选择计算: ${trimmedAmount} ÷ ${price} = ${quantity}`)
    console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)`)
  } else {
    toast.error('请先设置挂单价格')
  }
}, [orderPrice, quoteAsset, getQuantityPrecision])
```

**4. 价格变化时自动重新计算（useEffect）**
```typescript
useEffect(() => {
  if (paymentAmount && orderPrice && Number(paymentAmount) > 0 && Number(orderPrice) > 0) {
    const price = Number(orderPrice)
    const quantity = Number(paymentAmount) / price
    
    // 根据价格动态计算数量精度
    const quantityPrecision = getQuantityPrecision(price)
    const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))
    const newQuantity = formattedQuantity.toString()
    
    if (orderQuantity !== newQuantity) {
      setOrderQuantity(newQuantity)
      
      // 使用格式化后的数量重新计算支付金额（8位小数）
      const recalculatedAmount = (formattedQuantity * price).toFixed(8)
      const trimmedAmount = parseFloat(recalculatedAmount).toString()
      if (paymentAmount !== trimmedAmount) {
        setPaymentAmount(trimmedAmount)
      }
      
      console.log(`价格变化，重新计算: ${paymentAmount} ÷ ${price} = ${quantity}`)
      console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)，金额调整为 ${trimmedAmount}`)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [orderPrice, getQuantityPrecision])
```

**5. handlePlaceBuyOrder（下买单前验证）**
```typescript
// 根据价格动态计算数量精度
const quantityPrecision = getQuantityPrecision(price)
const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))

// 使用格式化后的数量计算最终支付金额（8 位精度）
const calculatedAmount = price * formattedQuantity
const expectedAmount = parseFloat(calculatedAmount.toFixed(8))

// 如果数量被矫正，直接使用重新计算的支付金额
if (formattedQuantity !== quantity) {
  console.warn(`数量精度超标: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)`)
  setOrderQuantity(formattedQuantity.toString())
  quantity = formattedQuantity
  
  // 根据矫正后的数量重新计算支付金额，直接使用不需要验证
  const trimmedAmount = parseFloat(expectedAmount.toFixed(8)).toString()
  setPaymentAmount(trimmedAmount)
  console.log(`数量矫正后重新计算支付金额: ${price} × ${formattedQuantity} = ${trimmedAmount}`)
} else {
  // 数量未被矫正，验证支付金额是否与 price * quantity 匹配
  const tolerance = 0.00000001 // 容差范围（8位精度）
  
  if (Math.abs(expectedAmount - inputAmount) > tolerance) {
    console.warn(`支付金额不匹配: 期望 ${expectedAmount}, 实际 ${inputAmount}`)
    toast.error(`支付金额不正确！应该是 ${expectedAmount.toFixed(8)} ${quoteAsset}`)
    // 自动修正支付金额
    setPaymentAmount(expectedAmount.toString())
    return
  }
}

try {
  console.log(`下买单: 代币=${selectedToken.symbol}, 价格=${price}, 数量精度=${quantityPrecision}位, 数量=${quantity}, 支付金额=${expectedAmount}(8位精度)`)
  // ...
}
```

**6. handlePlaceSellOrder（下卖单前验证）**
```typescript
// 根据价格动态计算数量精度
const quantityPrecision = getQuantityPrecision(price)
const formattedQuantity = parseFloat(quantity.toFixed(quantityPrecision))

// 使用格式化后的数量计算预计收入金额（8 位精度）
const calculatedAmount = price * formattedQuantity
const expectedAmount = parseFloat(calculatedAmount.toFixed(8))

// 如果数量被矫正，更新显示
if (formattedQuantity !== quantity) {
  console.warn(`数量精度超标: ${quantity} -> ${formattedQuantity} (${quantityPrecision}位，价格${price < 0.0001 ? '<' : '>='}0.0001)`)
  setOrderQuantity(formattedQuantity.toString())
  quantity = formattedQuantity
  console.log(`数量矫正后预计收入: ${price} × ${formattedQuantity} = ${expectedAmount}`)
}

try {
  console.log(`下卖单: 代币=${selectedToken.symbol}, 价格=${price}, 数量精度=${quantityPrecision}位, 数量=${quantity}, 预计收入=${expectedAmount}(8位精度)`)
  // ...
}
```

## 使用场景示例

### 场景 1: 极低价格代币（price < 0.0001）

- **代币**: SHIB
- **价格**: 0.00005 USDT
- **支付金额**: 10 USDT
- **计算过程**:
  1. `quantity = 10 / 0.00005 = 200000`
  2. 精度 = 0（整数）
  3. `formattedQuantity = 200000`（四舍五入）
  4. `recalculatedAmount = 200000 * 0.00005 = 10.00000000 USDT`

### 场景 2: 正常价格代币（price >= 0.0001）

- **代币**: BANANA
- **价格**: 0.5 USDT
- **支付金额**: 10 USDT
- **计算过程**:
  1. `quantity = 10 / 0.5 = 20`
  2. 精度 = 4（4位小数）
  3. `formattedQuantity = 20.0000`（四舍五入）
  4. `recalculatedAmount = 20.0000 * 0.5 = 10.00000000 USDT`

### 场景 3: 价格边界测试（price = 0.0001）

- **价格**: 0.0001 USDT（正好等于阈值）
- **精度**: 4（因为 >= 0.0001）
- **数量**: 可以是 1234.5678

### 场景 4: 价格刚好小于阈值（price = 0.00009999）

- **价格**: 0.00009999 USDT（小于阈值）
- **精度**: 0（整数）
- **数量**: 只能是 1234、5678 等整数

## 优势

1. **简化逻辑**: 不再依赖代币的 `tradeDecimal` 或 `decimals` 字段
2. **统一规则**: 所有代币使用相同的精度计算规则
3. **合理设计**: 
   - 低价代币通常交易量大，使用整数可以减少精度问题
   - 正常价代币使用 4 位小数提供灵活性
4. **易于维护**: 规则清晰，容易理解和调试
5. **自动同步**: 数量矫正后自动重新计算支付金额，确保数据一致性

## 注意事项

1. **支付金额精度**: 始终保持 8 位小数（USDT/USDC/BNB 标准）
2. **四舍五入**: 使用 `parseFloat(quantity.toFixed(precision))` 确保精度正确
3. **公式验证**: 始终验证 `price * quantity = paymentAmount`（在容差范围内）
4. **自动修正**: 如果用户输入的数量超过精度，系统会自动四舍五入并更新显示
5. **数量矫正后同步**: 当数量被矫正时，会立即根据矫正后的数量和价格重新计算支付金额，确保数据一致性

## 重要改进：数量矫正后自动更新支付金额（无需额外验证）

当在下单前检测到数量精度超标时，系统会：
1. **先计算最终金额**：使用矫正后的数量计算 `expectedAmount = price × formattedQuantity`（8位精度）
2. **矫正数量**：四舍五入到正确精度
3. **直接使用重新计算的支付金额**：不需要验证，因为是根据矫正后的数量计算的，肯定正确
4. 更新界面显示：同时更新 `orderQuantity` 和 `paymentAmount`

如果数量未被矫正，则进行常规验证：检查用户输入的支付金额是否与 `price × quantity` 匹配。

这样的设计更加简洁高效：
- **数量矫正场景**：直接使用计算值，不需要验证
- **数量未矫正场景**：验证用户输入的支付金额是否正确

### 示例

**场景 1：数量需要矫正（买单）**
- 价格: `0.5` USDT（精度 4）
- 用户输入数量: `100.123456`（超过 4 位精度）
- 用户输入支付金额: `50.0617728` USDT
- 系统处理:
  1. **先计算**: `expectedAmount = 0.5 × 100.1235 = 50.06175000` USDT
  2. **检测到数量超标**: `100.123456` → `100.1235`
  3. **直接使用计算值**: 更新 `paymentAmount` 为 `50.06175`，**不需要验证**
  4. 更新 `orderQuantity` 和 `paymentAmount` 状态
  5. 控制台输出: `数量矫正后重新计算支付金额: 0.5 × 100.1235 = 50.06175`

**场景 2：数量未矫正（买单）**
- 价格: `0.5` USDT（精度 4）
- 用户输入数量: `100.1234`（符合 4 位精度）
- 用户输入支付金额: `50.0617` USDT
- 系统处理:
  1. **计算**: `expectedAmount = 0.5 × 100.1234 = 50.0617` USDT
  2. **数量未超标**: 不需要矫正
  3. **验证支付金额**: `50.0617 == 50.0617`，通过验证
  4. 继续下单流程

**场景 3：数量未矫正但支付金额错误（买单）**
- 价格: `0.5` USDT（精度 4）
- 用户输入数量: `100.1234`（符合 4 位精度）
- 用户输入支付金额: `50` USDT（错误）
- 系统处理:
  1. **计算**: `expectedAmount = 0.5 × 100.1234 = 50.0617` USDT
  2. **数量未超标**: 不需要矫正
  3. **验证支付金额**: `50.0617 != 50`，验证失败
  4. **提示错误**: "支付金额不正确！应该是 50.0617 USDT"
  5. **自动修正**: 更新 `paymentAmount` 为 `50.0617`
  6. **阻止下单**: `return`

## 相关文件

- `/lib/binance-alpha-trading.ts` - 后端精度处理
- `/components/binance-alpha-trading.tsx` - 前端精度处理

## 调试

查看浏览器控制台的日志，确认：
1. 数量精度是否根据价格正确计算
2. 格式化后的数量是否符合预期
3. 支付金额是否正确计算（8 位小数）

日志示例：
```
支付金额失焦计算: 10 ÷ 0.00005 = 200000
数量精度调整: 200000 -> 200000 (0位，价格<0.0001)
支付金额调整: 10
```

```
支付金额失焦计算: 10 ÷ 0.5 = 20
数量精度调整: 20 -> 20 (4位，价格>=0.0001)
支付金额调整: 10
```

