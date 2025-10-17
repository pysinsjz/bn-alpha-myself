# workingQuantity 精度修复文档

## 问题描述

用户反馈 `workingQuantity` 仍然存在精度问题，导致下单失败。

## 根本原因

之前的实现使用了代币的 `decimals` 字段来控制交易数量的精度，但是这个字段是代币本身的精度（通常是 18），而不是币安 API 要求的**交易精度**。

币安 Alpha Token 有三个精度相关的字段：
1. **`decimals`** - 代币本身的精度（如 18）
2. **`denomination`** - 计价精度
3. **`tradeDecimal`** - **交易精度**（这个才是 API 要求的数量精度）

## 解决方案

### 1. 创建专用的数量格式化方法

在 `lib/binance-alpha-trading.ts` 中添加了 `formatQuantity` 方法：

```typescript
/**
 * 格式化数量到代币精度
 * @param quantity 原始数量
 * @param decimals 代币精度
 * @returns 格式化后的数量（number 类型）
 */
private formatQuantity(quantity: number, decimals: number): number {
  // 先转换为固定精度的字符串
  const fixed = quantity.toFixed(decimals)
  // 再转换回数字，这样可以确保精度正确
  return Number(fixed)
}
```

这个方法使用 `Number()` 而不是 `parseFloat()`，确保精度处理更加可靠。

### 2. 使用 tradeDecimal 而不是 decimals

#### 后端修改 (`lib/binance-alpha-trading.ts`)

**placeBuyOrder 方法：**
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
  
  // 使用交易精度（tradeDecimal）而不是代币精度（decimals）
  // tradeDecimal 是币安 API 要求的交易数量精度
  const tradeDecimal = params.token.tradeDecimal || params.token.decimals || 18
  
  // 格式化数量到交易精度（四舍五入）
  const formattedQuantity = this.formatQuantity(params.quantity, tradeDecimal)
  
  // 使用格式化后的数量重新计算支付金额
  // 确保 paymentAmount 精确等于 price * quantity
  const calculatedAmount = params.price * formattedQuantity
  
  // 根据报价资产确定金额精度（USDT/USDC 是 8 位）
  const amountPrecision = params.quoteAsset === 'BNB' ? 8 : 8
  
  // 格式化金额到指定精度
  const formattedAmount = this.formatAmount(calculatedAmount, amountPrecision)
  
  console.log(`下单参数: 代币=${params.token.symbol}, 交易精度=${tradeDecimal}, 原始数量=${params.quantity}, 格式化数量=${formattedQuantity}, 金额=${formattedAmount}`)
  
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

#### 前端修改 (`components/binance-alpha-trading.tsx`)

所有涉及数量计算的地方都改为使用 `tradeDecimal`：

**1. handlePaymentAmountBlur（支付金额失焦计算数量）：**
```typescript
const handlePaymentAmountBlur = useCallback(() => {
  if (paymentAmount && orderPrice && Number(paymentAmount) > 0 && Number(orderPrice) > 0) {
    const quantity = Number(paymentAmount) / Number(orderPrice)
    
    // 使用交易精度（tradeDecimal）而不是代币精度（decimals）
    const tradeDecimal = selectedToken?.tradeDecimal || selectedToken?.decimals || 18
    const formattedQuantity = parseFloat(quantity.toFixed(tradeDecimal))
    setOrderQuantity(formattedQuantity.toString())
    
    // 使用格式化后的数量重新计算支付金额（8位小数）
    const recalculatedAmount = (formattedQuantity * Number(orderPrice)).toFixed(8)
    const trimmedAmount = parseFloat(recalculatedAmount).toString()
    setPaymentAmount(trimmedAmount)
    
    console.log(`支付金额失焦计算: ${paymentAmount} ÷ ${orderPrice} = ${quantity}`)
    console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (交易精度=${tradeDecimal})`)
    console.log(`支付金额调整: ${trimmedAmount}`)
  } else if (!orderPrice || Number(orderPrice) <= 0) {
    toast.error('请先设置挂单价格')
  }
}, [paymentAmount, orderPrice, selectedToken])
```

**2. handleOrderQuantityBlur（数量失焦计算支付金额）：**
```typescript
const handleOrderQuantityBlur = useCallback(() => {
  if (orderQuantity && orderPrice && Number(orderQuantity) > 0 && Number(orderPrice) > 0) {
    // 使用交易精度（tradeDecimal）而不是代币精度（decimals）
    const tradeDecimal = selectedToken?.tradeDecimal || selectedToken?.decimals || 18
    const quantity = Number(orderQuantity)
    const formattedQuantity = parseFloat(quantity.toFixed(tradeDecimal))
    
    // 如果格式化后的数量不同，更新显示
    if (formattedQuantity !== quantity) {
      setOrderQuantity(formattedQuantity.toString())
      console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (交易精度=${tradeDecimal})`)
    }
    
    // 使用格式化后的数量计算支付金额（8 位小数）
    const amount = formattedQuantity * Number(orderPrice)
    const newAmount = amount.toFixed(8)
    const trimmedAmount = parseFloat(newAmount).toString()
    setPaymentAmount(trimmedAmount)
    console.log(`挂单数量失焦计算: ${formattedQuantity} × ${orderPrice} = ${trimmedAmount}`)
  } else if (!orderPrice || Number(orderPrice) <= 0) {
    toast.error('请先设置挂单价格')
  }
}, [orderQuantity, orderPrice, selectedToken])
```

**3. handleQuickAmountSelect（快捷金额选择）：**
```typescript
const handleQuickAmountSelect = useCallback((amount: number) => {
  // 确保金额精度为 8 位
  const formattedAmount = amount.toFixed(8)
  const trimmedAmount = parseFloat(formattedAmount).toString()
  setPaymentAmount(trimmedAmount)
  
  // 如果有价格，立即计算数量
  if (orderPrice && Number(orderPrice) > 0) {
    const quantity = amount / Number(orderPrice)
    
    // 使用交易精度（tradeDecimal）而不是代币精度（decimals）
    const tradeDecimal = selectedToken?.tradeDecimal || selectedToken?.decimals || 18
    const formattedQuantity = parseFloat(quantity.toFixed(tradeDecimal))
    setOrderQuantity(formattedQuantity.toString())
    
    toast.success(`已设置支付金额 ${trimmedAmount} ${quoteAsset}，数量 ${formattedQuantity}`)
    console.log(`快捷选择计算: ${trimmedAmount} ÷ ${orderPrice} = ${quantity}`)
    console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (交易精度=${tradeDecimal})`)
  } else {
    toast.error('请先设置挂单价格')
  }
}, [orderPrice, quoteAsset, selectedToken])
```

**4. 价格变化时自动重新计算 useEffect：**
```typescript
useEffect(() => {
  if (paymentAmount && orderPrice && Number(paymentAmount) > 0 && Number(orderPrice) > 0 && selectedToken) {
    const quantity = Number(paymentAmount) / Number(orderPrice)
    
    // 使用交易精度（tradeDecimal）而不是代币精度（decimals）
    const tradeDecimal = selectedToken.tradeDecimal || selectedToken.decimals || 18
    const formattedQuantity = parseFloat(quantity.toFixed(tradeDecimal))
    const newQuantity = formattedQuantity.toString()
    
    if (orderQuantity !== newQuantity) {
      setOrderQuantity(newQuantity)
      
      // 使用格式化后的数量重新计算支付金额（8位小数）
      const recalculatedAmount = (formattedQuantity * Number(orderPrice)).toFixed(8)
      const trimmedAmount = parseFloat(recalculatedAmount).toString()
      if (paymentAmount !== trimmedAmount) {
        setPaymentAmount(trimmedAmount)
      }
      
      console.log(`价格变化，重新计算: ${paymentAmount} ÷ ${orderPrice} = ${quantity}`)
      console.log(`数量精度调整: ${quantity} -> ${formattedQuantity} (交易精度=${tradeDecimal})，金额调整为 ${trimmedAmount}`)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [orderPrice, selectedToken])
```

**5. handlePlaceBuyOrder（下买单前验证）：**
```typescript
// 使用交易精度（tradeDecimal）而不是代币精度（decimals）
const tradeDecimal = selectedToken.tradeDecimal || selectedToken.decimals || 18
const formattedQuantity = parseFloat(quantity.toFixed(tradeDecimal))

// 如果数量精度超标，提示并更新
if (formattedQuantity !== quantity) {
  console.warn(`数量精度超标: ${quantity} -> ${formattedQuantity} (交易精度=${tradeDecimal})`)
  setOrderQuantity(formattedQuantity.toString())
  quantity = formattedQuantity
}

// 使用格式化后的数量计算期望支付金额（8 位精度）
const calculatedAmount = price * quantity
const expectedAmount = parseFloat(calculatedAmount.toFixed(8))
const tolerance = 0.00000001 // 容差范围（8位精度）

// 验证支付金额是否与 price * quantity 匹配
if (Math.abs(expectedAmount - inputAmount) > tolerance) {
  console.warn(`支付金额不匹配: 期望 ${expectedAmount}, 实际 ${inputAmount}`)
  toast.error(`支付金额不正确！应该是 ${expectedAmount.toFixed(8)} ${quoteAsset}`)
  // 自动修正支付金额
  setPaymentAmount(expectedAmount.toString())
  return
}

try {
  console.log(`下买单: 代币=${selectedToken.symbol}, 交易精度=${tradeDecimal}, 价格=${price}, 数量=${quantity}, 支付金额=${expectedAmount}(8位精度)`)
  // ...
}
```

**6. handlePlaceSellOrder（下卖单前验证）同样修改。**

## 精度优先级

```typescript
const tradeDecimal = params.token.tradeDecimal || params.token.decimals || 18
```

优先使用 `tradeDecimal`，如果不存在则使用 `decimals`，最后回退到 18。

## 验证方式

1. **控制台日志**：所有涉及精度的计算都会输出详细的日志，包括：
   - 代币名称
   - 使用的交易精度值
   - 原始数量 → 格式化后的数量
   - 计算的金额

2. **自动修正**：如果用户输入的数量超过了交易精度，系统会自动四舍五入并更新显示。

3. **双重验证**：
   - 前端在下单前验证 `price * quantity = paymentAmount`
   - 后端在调用 API 前重新计算和格式化

## 相关文件

- `/lib/binance-alpha-trading.ts` - 后端精度处理
- `/components/binance-alpha-trading.tsx` - 前端精度处理
- `/types/alpha.ts` - `BinanceAlphaToken` 类型定义（包含 `tradeDecimal` 字段）

## 测试建议

1. 选择不同的 Alpha 代币（它们可能有不同的 `tradeDecimal` 值）
2. 输入各种支付金额，检查计算出的数量精度是否正确
3. 输入各种数量，检查计算出的支付金额是否正确
4. 使用快捷金额按钮（1, 10, 100, 1000），检查精度处理
5. 查看浏览器控制台，确认日志中显示的交易精度值正确

## 修复日期

2025-10-17

