# Binance Alpha 交易统计系统 - 完整文档

## 📋 项目概述

这是一个用于分析和展示币安 Alpha 交易数据的 Web 应用程序。用户可以通过输入或选择钱包地址，查看该地址在币安 Alpha 上的交易历史、代币流入流出情况、盈亏统计以及积分计算。

### 主要功能

- 🔍 **钱包地址管理**：添加、编辑、删除和搜索多个钱包地址
- 📊 **交易数据展示**：显示详细的交易历史记录
- 💰 **盈亏统计**：实时计算代币的盈亏情况
- 🎯 **积分系统**：根据交易额计算积分和里程进度
- 🌓 **主题切换**：支持明暗主题切换
- 📱 **响应式设计**：支持移动端和桌面端访问
- 🔐 **钱包连接**：支持 MetaMask、WalletConnect、Coinbase Wallet 等
- 💱 **代币交易**：直接在应用内进行 Alpha 代币交易

---

## 🏗️ 技术栈

### 前端框架
- **Next.js 15.2.1**：React 框架，使用 App Router
- **React 19.1.0**：UI 组件库
- **TypeScript 5.8.3**：类型安全

### UI 组件库
- **Radix UI**：无障碍的 UI 组件基础
- **Tailwind CSS 4.1.7**：原子化 CSS 框架
- **Lucide React**：图标库
- **Motion (Framer Motion v12)**：动画库

### 状态管理
- **Jotai**：轻量级状态管理
- **TanStack Query (React Query)**：服务端状态管理和数据获取

### 区块链交互
- **Viem 2.29.4**：以太坊交互库
- **Wagmi 2.x**：React Hooks for Ethereum（钱包连接和交易）
- **@wagmi/core**：Wagmi 核心库
- **@wagmi/connectors**：钱包连接器（MetaMask、WalletConnect 等）
- **Axios**：HTTP 客户端

### 其他工具
- **Day.js**：日期时间处理
- **DND Kit**：拖拽排序功能
- **Lodash-ES**：工具函数库

---

## 📁 项目结构

```
bn-alpha/
├── app/                          # Next.js App Router 目录
│   ├── [address]/               # 动态路由：地址详情页
│   │   └── page.tsx            # 交易详情页面
│   ├── api/                     # API 路由
│   │   ├── blocks/             # 区块号查询 API
│   │   │   └── route.ts
│   │   └── transactions/        # 交易数据查询 API
│   │       └── route.ts
│   ├── layout.tsx               # 根布局组件
│   ├── page.tsx                 # 首页
│   └── providers.tsx            # 全局 Provider 配置
│
├── atoms/                        # Jotai 状态管理
│   └── index.ts                 # 钱包列表状态
│
├── components/                   # React 组件
│   ├── layout/                  # 布局组件
│   │   ├── alert.tsx           # 警告提示
│   │   ├── dashboard.tsx       # 仪表盘布局
│   │   └── footer.tsx          # 页脚
│   ├── theme/                   # 主题相关
│   │   ├── theme-provider.tsx  # 主题提供者
│   │   └── theme-toggle.tsx    # 主题切换按钮
│   ├── ui/                      # 基础 UI 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...                 # 其他 UI 组件
│   ├── transaction-search.tsx   # 交易搜索组件
│   ├── transaction-table.tsx    # 交易表格组件
│   ├── wallet-connect.tsx       # 钱包连接组件（新）
│   ├── wallet-overview.tsx      # 钱包概览组件
│   ├── wallet-selector.tsx      # 钱包选择器
│   └── swap-transaction.tsx     # 代币交易组件（新）
│
├── configs/                      # 配置文件
│   ├── index.ts                 # API Keys 配置
│   └── wagmi.ts                 # Wagmi 钱包配置
│
├── constants/                    # 常量定义
│   ├── abis.ts                  # 合约 ABI
│   ├── index.ts                 # 地址常量
│   ├── routes.ts                # 路由配置
│   └── tokens.ts                # Alpha 代币列表 (1932 行)
│
├── hooks/                        # 自定义 Hooks
│   ├── use-block.ts             # 区块查询
│   ├── use-local-storage.ts     # 本地存储
│   └── use-transaction.ts       # 交易数据获取
│
├── lib/                          # 工具函数库
│   ├── api.ts                   # API 请求封装
│   ├── dayjs.ts                 # 日期配置
│   ├── swap.ts                  # 交易构建函数（新）
│   └── utils.ts                 # 通用工具函数
│
├── types/                        # TypeScript 类型定义
│   └── index.ts
│
├── styles/                       # 样式文件
│   └── globals.css
│
├── middleware.ts                 # Next.js 中间件（API 保护）
├── next.config.ts               # Next.js 配置
├── tsconfig.json                # TypeScript 配置
└── package.json                 # 项目依赖

```

---

## 🔑 核心功能详解

### 1. 钱包连接系统（新增）

#### 位置
- `configs/wagmi.ts` - Wagmi 配置
- `components/wallet-connect.tsx` - 钱包连接 UI
- `app/providers.tsx` - Provider 集成

#### 功能特性
- **多钱包支持**：MetaMask、WalletConnect、Coinbase Wallet、浏览器内置钱包
- **连接管理**：连接、断开、地址显示
- **地址复制**：一键复制钱包地址
- **状态管理**：使用 Wagmi Hooks 管理连接状态

#### Wagmi 配置
```typescript
// configs/wagmi.ts
export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'Binance Alpha Trading' }),
  ],
  transports: {
    [bsc.id]: http('https://bsc.blockrazor.xyz'),
  },
})
```

#### 使用的 Hooks
- `useAccount()` - 获取连接的账户信息
- `useConnect()` - 连接钱包
- `useDisconnect()` - 断开连接

#### 重要提示
- 需要在 [WalletConnect Cloud](https://cloud.walletconnect.com) 注册并获取 Project ID
- 将 `configs/wagmi.ts` 中的 `YOUR_PROJECT_ID` 替换为实际的 Project ID

---

### 2. 代币交易功能（新增）

#### 位置
- `lib/swap.ts` - 交易构建逻辑
- `components/swap-transaction.tsx` - 交易 UI

#### 功能特性
- **代币选择**：选择源代币和目标代币
- **金额输入**：输入交易金额
- **滑点设置**：自定义滑点容忍度（默认 0.5%）
- **实时估算**：自动估算输出金额（需实现）
- **交易发送**：构建并发送交易到链上
- **交易状态**：显示交易进度和结果

#### 交易流程
```typescript
// 1. 用户输入金额和选择代币
// 2. 估算输出金额（需调用 DEX API）
const result = await estimateSwapOutput({
  fromToken, toToken, fromAmount, fromDecimals
})

// 3. 构建交易数据
const tx = buildSwapTransaction({
  fromToken, toToken, fromAmount, fromDecimals,
  minReturnAmount: toAmount,
  slippage: 0.5
})

// 4. 发送交易
sendTransaction({
  to: tx.to,
  data: tx.data,
  value: tx.value,
})

// 5. 等待确认
const receipt = await waitForTransactionReceipt({ hash })
```

#### 使用的 Hooks
- `useSendTransaction()` - 发送交易
- `useWaitForTransactionReceipt()` - 等待交易确认
- `useAccount()` - 获取当前账户

#### 支持的代币
**源代币（稳定币）**：
- USDT
- USDC
- WBNB

**目标代币**：
- 所有 Alpha 代币列表中的代币（1900+ 个）

#### 重要提示
⚠️ **当前实现是演示版本**，实际使用需要：
1. **实现代币授权**：在交易前需要授权 DEX Router 使用代币
2. **集成 DEX API**：实现 `estimateSwapOutput` 函数调用实际的 DEX 报价 API
3. **完善交易数据构建**：根据实际的币安 DEX Router 合约 ABI 构建正确的交易数据
4. **添加安全检查**：价格影响、最小输出、余额检查等

#### 交易构建函数
```typescript
// lib/swap.ts

// 构建授权交易
buildApproveTransaction(tokenAddress, amount)

// 构建 Swap 交易
buildSwapTransaction({
  fromToken, toToken, fromAmount, fromDecimals,
  minReturnAmount, slippage
})

// 检查授权额度
checkAllowance(tokenAddress, ownerAddress, spenderAddress)

// 估算输出（需实现）
estimateSwapOutput({ fromToken, toToken, fromAmount, fromDecimals })
```

---

### 3. 钱包地址管理系统

#### 位置
- `atoms/index.ts` - 状态管理
- `components/wallet-selector.tsx` - UI 组件

#### 功能特性
- **添加钱包**：输入地址和备注，支持地址验证
- **编辑钱包**：内联编辑钱包备注
- **删除钱包**：移除不需要的钱包
- **拖拽排序**：使用 DND Kit 实现钱包列表的拖拽排序
- **搜索过滤**：支持按地址或备注搜索钱包
- **本地持久化**：使用 `localStorage` 保存钱包列表

#### 核心代码
```typescript
// atoms/index.ts
export const walletsAtom = atomWithStorage<Wallet[]>('walletList', [])
```

---

### 4. 交易数据获取与处理

#### API 路由 (`app/api/transactions/route.ts`)

**流程说明**：
1. 接收钱包地址、起始区块、结束区块参数
2. 并行获取三种类型的交易：
   - `txlist`：普通交易
   - `txlistinternal`：内部交易
   - `tokentx`：代币交易
3. 过滤出与币安 DEX Router 相关的交易
4. 解析交易数据，提取源代币和目标代币信息
5. 匹配 Alpha 代币列表
6. 返回处理后的交易数据

**关键代码片段**：
```typescript
// 筛选币安 DEX 交易
const isBinanceDexTx = (from: Hex, to: Hex) =>
  isAddressEqual(from, address) && isAddressEqual(to, BN_DEX_ROUTER_ADDRESS)

// 匹配 Alpha 代币
const isAlphaTokenTx = (contractAddress: Hex) =>
  alphaTokens.some(token => isAddressEqual(token.contractAddress, contractAddress))
```

---

### 5. 交易数据解析 (`lib/utils.ts` - `getSwapInfo`)

**功能**：解析交易输入数据，提取交换信息

**支持的路由**：
- `proxySwap` (0xdad12b6c)
- `proxySwapV2` (0xe5e8894b)
- `callOneInch` (0xa03de6a9)
- `callRango` (0xdadb693f)
- `callLiFi` (0x849ce572)
- `callQuant` (0x3166c37c)

**流程**：
1. 根据方法 ID 匹配路由配置
2. 使用 `decodeFunctionData` 解析交易输入
3. 根据路径提取源代币和目标代币地址及数量
4. 查询代币信息（symbol, decimals）
5. 返回格式化的交换信息

---

### 6. 代币价格获取 (`lib/api.ts` - `getTokenPrice`)

**价格源（按优先级）**：
1. **USDT 固定价格**：$1.00
2. **CryptoCompare API**：主流代币价格
3. **GeckoTerminal API**：DEX 代币价格
4. **DexScreener API**：备用价格源

**特殊处理**：
- WBNB 自动转换为 BNB 查询
- 失败重试机制，依次尝试所有价格源

---

### 7. 积分计算系统 (`lib/utils.ts` - `calculatePoints`)

**公式**：基于 2 的幂次方
- 交易额 < $2：0 分
- 交易额 ≥ $2：分数 = floor(log₂(交易额))

**示例**：
```typescript
calculatePoints(1)    // { points: 0, range: [0, 2] }
calculatePoints(5)    // { points: 2, range: [4, 8] }
calculatePoints(20)   // { points: 4, range: [16, 32] }
calculatePoints(100)  // { points: 6, range: [64, 128] }
```

**里程进度**：
- 显示当前交易额在积分区间中的位置
- 进度条显示距离下一个积分等级的进度

---

### 8. 时间范围计算 (`lib/utils.ts` - `getDynamicTimeRange`)

**逻辑**：
- 基于上海时区（Asia/Shanghai）
- 时间范围：每天 08:00:00 - 次日 07:59:59
- 如果当前时间在 08:00 之前，则使用前一天的时间范围

**代码**：
```typescript
export function getDynamicTimeRange() {
  const now = dayjs.tz(undefined, 'Asia/Shanghai')
  const isBefore8AM = now.hour() < 8
  const baseDay = isBefore8AM ? now.subtract(1, 'day') : now
  return [
    baseDay.set('hour', 8).startOf('hour'), 
    baseDay.add(1, 'day').set('hour', 7).endOf('hour')
  ]
}
```

---

### 9. 数据缓存机制

#### 代币价格缓存
- **位置**：`hooks/use-transaction.ts`
- **缓存时长**：5 分钟
- **存储方式**：localStorage
- **数据结构**：
```typescript
interface TokenPriceCache {
  symbol: string
  price: number
  timestamp: number
}
```

#### 区块号缓存
- **位置**：`hooks/use-block.ts`
- **存储方式**：localStorage
- **作用**：避免重复查询同一时间戳的区块号

---

## 🎨 UI 组件说明

### 1. WalletConnect (`components/wallet-connect.tsx`) - 新增

**功能**：
- 连接 Web3 钱包
- 支持多种钱包类型
- 显示连接状态
- 地址复制功能

**支持的钱包**：
- MetaMask
- WalletConnect
- Coinbase Wallet
- 浏览器内置钱包

**技术要点**：
- 使用 Wagmi 的 `useConnect` Hook
- 模态框选择钱包类型
- 响应式设计

---

### 2. SwapTransaction (`components/swap-transaction.tsx`) - 新增

**功能**：
- 代币交易界面
- 实时价格估算
- 滑点设置
- 交易状态追踪

**UI 元素**：
- 代币选择下拉框
- 金额输入框
- 交换按钮（翻转代币）
- 滑点设置
- 交易确认按钮
- 交易哈希链接

**安全提示**：
- 显示警告信息
- 确认前检查
- 防止重复提交

---

### 3. WalletSelector (`components/wallet-selector.tsx`)

**功能**：
- 钱包列表的选择、管理、编辑
- 支持拖拽排序
- 搜索过滤
- 复制地址到剪贴板

**技术要点**：
- 使用 `@dnd-kit` 实现拖拽
- 自定义 Select 组件支持搜索
- 内联编辑支持 Enter 保存、Escape 取消

---

### 4. TransactionTable (`components/transaction-table.tsx`)

**两种视图**：

#### 交易视图
- 显示每笔交易的详细信息
- 字段：交易哈希、时间、源代币、目标代币、手续费
- 过滤器：全部/买入/卖出
- 可隐藏失败交易
- 时间格式切换：相对时间 / 绝对时间

#### 代币视图
- 显示代币的聚合统计
- 字段：代币、流入、流出、净流入、利润
- 按净流入排序

**动画效果**：
- 使用 Framer Motion 实现列表项淡入动画
- 延迟动画避免同时加载

---

### 5. WalletOverview (`components/wallet-overview.tsx`)

**显示内容**：
- 钱包地址（可复制）
- 交易额（自动 x2 计算）
- 积分
- 利润（带颜色指示）
- 里程进度条

**特殊逻辑**：
- 交易额乘以 2 用于积分计算
- 利润根据正负显示不同颜色

---

## 🔒 安全机制

### 中间件保护 (`middleware.ts`)

**API 访问限制**：
1. **域名白名单**：
   - `http://localhost:3000`
   - `https://bn-alpha.site`
   - `https://www.bn-alpha.site`

2. **User-Agent 黑名单**：
   - curl
   - wget
   - python-requests
   - postman
   - insomnia
   - httpie

3. **CORS 配置**：
   - 设置允许的源
   - 限制请求方法为 GET、POST、OPTIONS

4. **安全响应头**：
   ```
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   ```

---

## 🔌 API 密钥管理

### 配置文件 (`configs/index.ts`)

**BSCScan API Keys**：
- **default**：1 个密钥
- **txlist**：12 个密钥（轮询使用）
- **txlistinternal**：12 个密钥
- **tokentx**：12 个密钥

**使用策略**：
- 根据 API 操作类型选择对应的密钥池
- 随机选择一个密钥使用
- 避免单个密钥达到速率限制

---

## 📊 数据流向图

```
用户输入地址
    ↓
查询区块号 (useBlockNumber)
    ↓
获取交易数据 (useTransaction)
    ↓
API Route: /api/transactions
    ↓
并行获取: txlist + txlistinternal + tokentx
    ↓
过滤 Alpha 代币交易
    ↓
解析交易数据
    ↓
获取代币价格 (多个价格源)
    ↓
计算代币统计 (流入/流出/盈亏)
    ↓
返回给前端
    ↓
显示在 UI: WalletOverview + TransactionTable
```

---

## 🛠️ 关键工具函数

### 地址比较 (`lib/utils.ts`)
```typescript
export function isAddressEqual(a: Hex, b: Hex): boolean {
  if (!isAddress(a) || !isAddress(b)) return false
  return _isAddressEqual(a, b)
}
```

### 重试机制 (`lib/utils.ts`)
```typescript
export function retry<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>, 
  times = 0, 
  delay = 0
) {
  // 自动重试失败的异步函数
}
```

### 错误信息提取 (`lib/utils.ts`)
```typescript
export function getErrorMessage(error: any) {
  // 从复杂的错误对象中提取有用的错误信息
}
```

---

## 📝 类型系统

### 主要类型定义 (`types/index.ts`)

#### AlphaTokenInfo
```typescript
interface AlphaTokenInfo {
  chainId: string
  contractAddress: Hex
  name: string
  symbol: string
  decimals: number
}
```

#### TransactionInfo
```typescript
interface TransactionInfo {
  hash: Hex
  timestamp: number
  from: {
    address: Hex
    symbol: string
    decimals: number
    amount: number
    price: number
  }
  to: {
    address: Hex
    symbol: string
    decimals: number
    amount: number
    price: number
  }
  gas: number
  status: 'success' | 'failed'
}
```

#### TokenInfo
```typescript
interface TokenInfo {
  address: Hex
  symbol: string
  decimals: number
  in: number      // 流入数量
  out: number     // 流出数量
  price: number   // 当前价格
}
```

#### Wallet
```typescript
interface Wallet {
  address: Hex
  label: string
  disabled?: boolean
}
```

---

## 🚀 运行与部署

### 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动时使用 Turbopack
pnpm dev --turbopack
```

### 生产构建
```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

### 其他命令
```bash
# 代码检查
pnpm lint

# 获取 Alpha 代币列表（自定义脚本）
pnpm fetch
```

---

## 🧩 常量与配置

### 重要地址 (`constants/index.ts`)
```typescript
BN_DEX_ROUTER_ADDRESS = '0xb300000b72DEAEb607a12d5f54773D1C19c7028d'
USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'
USDC_ADDRESS = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
USD1_ADDRESS = '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d'
WBNB_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
```

### Alpha 代币列表 (`constants/tokens.ts`)
- 包含 1932 行代币数据
- 每个代币包含：chainId、contractAddress、name、symbol、decimals
- 所有代币均为 BSC 链（chainId: '56'）

---

## 🎯 业务逻辑要点

### 交易筛选规则
1. 必须是发送到币安 DEX Router 的交易
2. 必须包含 Alpha 代币列表中的代币
3. 必须是有效的代币交换（从有效源代币到 Alpha 代币，或反之）

### 有效源代币
- BNB (原生代币)
- USDT
- USDC
- USD1
- WBNB

### 买入 vs 卖出
- **买入**：目标代币是 Alpha 代币
- **卖出**：源代币是 Alpha 代币

### 盈亏计算
```typescript
const pnl = tokens.reduce((acc, token) => {
  const netFlow = token.in - token.out
  if (netFlow === 0) return acc
  const profit = netFlow * token.price
  return acc + profit
}, 0)
```

---

## 🔄 数据更新策略

### React Query 配置
```typescript
defaultOptions: {
  queries: {
    refetchOnWindowFocus: false,  // 不在窗口聚焦时刷新
    retry: 1,                      // 失败重试 1 次
  }
}
```

### 手动刷新
- 用户可以在同一地址下重新搜索来刷新数据
- 使用 React Query 的 `refetch` 功能

---

## 🎨 样式系统

### Tailwind CSS 配置
- 使用 Tailwind CSS 4.x
- 支持暗色模式
- 自定义动画（tailwindcss-animate）

### 主题系统
- **Provider**：`components/theme/theme-provider.tsx`
- **切换按钮**：`components/theme/theme-toggle.tsx`
- **默认主题**：跟随系统
- **存储位置**：localStorage

---

## 📱 响应式设计

### 断点使用
- **移动端**：默认样式
- **桌面端**：`md:` 前缀

### 适配策略
- 钱包选择器在移动端显示图标，桌面端显示文字
- 表格在小屏幕上优化列宽
- 对话框在移动端占据 95vw，桌面端固定宽度

---

## 🐛 错误处理

### API 错误
- 显示在页面上的 Alert 组件
- 自动提取有用的错误信息

### 价格获取失败
- 依次尝试多个价格源
- 如果所有源都失败，抛出错误

### 交易数据为空
- 显示"暂无交易记录"
- 骨架屏加载状态

---

## 📈 性能优化

1. **数据缓存**：
   - 代币价格缓存 5 分钟
   - 区块号缓存
   - 交易设置缓存

2. **懒加载**：
   - 使用 Next.js 的动态导入
   - 骨架屏优化加载体验

3. **并行请求**：
   - 同时获取多种类型的交易数据
   - 批量获取代币价格

4. **动画优化**：
   - 使用 Framer Motion 的性能优化特性
   - 限制同时播放的动画数量

---

## 🔮 可能的改进方向

1. **功能增强**：
   - ✅ ~~钱包连接功能~~（已实现）
   - ✅ ~~代币交易功能~~（已实现基础版本）
   - 导出交易数据为 CSV
   - 添加图表可视化（价格走势、盈亏趋势）
   - 支持批量钱包分析
   - 交易提醒功能
   - 实现代币授权管理
   - 集成实际的 DEX 报价 API
   - 添加交易历史记录

2. **性能提升**：
   - 使用 Web Worker 处理大量数据
   - 虚拟滚动优化长列表
   - 服务端缓存交易数据

3. **用户体验**：
   - 添加钱包分组功能
   - 支持标签和筛选
   - 历史记录和比较功能
   - 移动端 App

4. **技术升级**：
   - 使用 Server Actions 替代 API Routes
   - 实现实时数据推送
   - 添加单元测试和 E2E 测试

---

## 📚 相关资源

- **Next.js 文档**：https://nextjs.org/docs
- **Viem 文档**：https://viem.sh
- **Radix UI**：https://www.radix-ui.com
- **TanStack Query**：https://tanstack.com/query
- **Jotai**：https://jotai.org
- **BSCScan API**：https://bscscan.com/apis

---

## 👨‍💻 开发者信息

- **作者**：holazz
- **GitHub**：https://github.com/holazz
- **许可证**：见 LICENSE 文件

---

## 📌 注意事项

1. **API Keys 安全**：
   - 配置文件中的 API Keys 应该使用环境变量
   - 不要将真实的 API Keys 提交到公共仓库

2. **速率限制**：
   - BSCScan API 有每日请求限制
   - 使用多个 API Keys 轮询可以提高限额

3. **价格准确性**：
   - 价格来自第三方 API，可能存在延迟
   - 仅供参考，不作为投资建议

4. **交易数据**：
   - 仅显示与 Alpha 代币相关的交易
   - 可能无法捕获所有交易类型

---

## 🎉 总结

这是一个功能完善的币安 Alpha 交易统计系统，具有以下特点：

✅ **完整的数据链路**：从区块链获取 → API 处理 → 前端展示  
✅ **良好的用户体验**：响应式设计、流畅动画、直观操作  
✅ **可靠的架构**：类型安全、错误处理、数据缓存  
✅ **安全的 API**：访问控制、速率限制、CORS 配置  
✅ **可扩展性**：模块化设计、清晰的代码结构  

希望这份文档能帮助你快速理解整个项目的架构和实现细节！🚀

