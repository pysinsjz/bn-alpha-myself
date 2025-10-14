# Binance Alpha 交易统计与交易平台

一个用于分析币安 Alpha 交易数据并支持直接交易的 Web 应用。

## ✨ 主要功能

- 📊 **交易数据分析**：查看和分析钱包的 Alpha 代币交易历史
- 💰 **盈亏统计**：实时计算代币的流入流出和盈亏情况
- 🎯 **积分系统**：基于交易额计算积分和里程
- 🔐 **钱包连接**：支持 MetaMask、WalletConnect、Coinbase Wallet
- 💱 **代币交易**：直接在应用内进行 Alpha 代币买卖
- 🌓 **明暗主题**：支持主题切换
- 📱 **响应式设计**：完美支持移动端和桌面端

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 9+
- MetaMask 或其他 Web3 钱包（用于交易功能）

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd bn-alpha

# 安装依赖
pnpm install
```

### 配置

#### 1. WalletConnect Project ID

在 [WalletConnect Cloud](https://cloud.walletconnect.com) 注册并获取 Project ID，然后在 `configs/wagmi.ts` 中配置：

```typescript
const projectId = 'YOUR_PROJECT_ID' // 替换为你的 Project ID
```

#### 2. 环境变量（可选）

创建 `.env.local` 文件：

```env
# BSCScan API Keys（如果需要更多配额）
NEXT_PUBLIC_BSCSCAN_API_KEY=your_api_key
```

### 运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start
```

访问 http://localhost:3000

## 📖 使用指南

### 查看交易统计

1. 在首页点击"添加钱包"或输入钱包地址
2. 系统会自动获取并分析该地址的 Alpha 代币交易
3. 查看交易历史、代币统计和盈亏情况

### 进行代币交易

1. 点击"连接钱包"按钮
2. 选择你的钱包类型（MetaMask、WalletConnect 等）
3. 在交易界面选择要交易的代币
4. 输入金额并设置滑点
5. 点击"交易"按钮确认交易

⚠️ **重要提示**：当前交易功能是演示版本，实际使用前需要完善以下内容：
- 实现代币授权逻辑
- 集成实际的 DEX 报价 API
- 完善交易数据构建

## 🛠️ 技术栈

- **框架**：Next.js 15 + React 19
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **状态管理**：Jotai + TanStack Query
- **区块链**：Viem + Wagmi
- **UI 组件**：Radix UI
- **动画**：Framer Motion

## 📁 项目结构

```
bn-alpha/
├── app/                  # Next.js 页面和 API
├── components/           # React 组件
│   ├── wallet-connect.tsx    # 钱包连接
│   ├── swap-transaction.tsx  # 交易界面
│   └── ...
├── configs/             # 配置文件
│   ├── wagmi.ts        # Wagmi 配置
│   └── index.ts        # API Keys
├── lib/                # 工具函数
│   ├── swap.ts        # 交易构建
│   └── ...
├── constants/          # 常量和代币列表
└── hooks/             # 自定义 Hooks
```

## 📚 文档

详细文档请查看 [DOCUMENTATION.md](./DOCUMENTATION.md)

## 🔒 安全提示

- ⚠️ 永远不要分享你的私钥
- ⚠️ 在进行真实交易前，请先进行小额测试
- ⚠️ 注意检查代币地址和交易参数
- ⚠️ 设置合理的滑点以避免价格影响过大

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

见 LICENSE 文件

## 👨‍💻 作者

Made with ❤️ by [holazz](https://github.com/holazz)
