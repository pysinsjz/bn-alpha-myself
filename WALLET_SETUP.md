# 钱包连接设置指南

## 当前可用的钱包连接方式

目前系统支持以下几种钱包连接方式：

### 1. MetaMask
- **推荐使用**
- 需要安装 MetaMask 浏览器插件
- 下载地址：https://metamask.io/

### 2. 浏览器内置钱包（Injected）
- 支持任何兼容 Web3 的浏览器钱包
- 如 Brave 浏览器内置的钱包
- 无需额外配置

### 3. Coinbase Wallet
- 需要安装 Coinbase Wallet 浏览器插件
- 下载地址：https://www.coinbase.com/wallet

### 4. WalletConnect（已禁用）
- 需要配置 Project ID 才能使用
- 适用于移动端钱包扫码连接

---

## 如何启用 WalletConnect

如果您需要使用 WalletConnect（移动钱包扫码连接），请按以下步骤操作：

### 步骤 1：获取 Project ID

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com)
2. 注册或登录账号
3. 点击 "Create New Project" 创建新项目
4. 填写项目信息：
   - **Project Name**: Binance Alpha Trading
   - **Description**: 币安 Alpha 交易统计系统
5. 创建完成后，复制 **Project ID**

### 步骤 2：配置代码

打开 `configs/wagmi.ts` 文件，进行以下修改：

```typescript
import { http } from 'viem'
import { bsc } from 'viem/chains'
import { coinbaseWallet, injected, metaMask, walletConnect } from '@wagmi/connectors'
import { createConfig } from '@wagmi/core'

// 将这里的 YOUR_PROJECT_ID 替换为您的实际 Project ID
const projectId = 'YOUR_PROJECT_ID'

export const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    metaMask(),
    ...(typeof window !== 'undefined'
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
          }),
          coinbaseWallet({
            appName: 'Binance Alpha Trading',
          }),
        ]
      : []),
  ],
  transports: {
    [bsc.id]: http('https://bsc.blockrazor.xyz'),
  },
  ssr: true,
})
```

### 步骤 3：重启服务器

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
pnpm dev
```

---

## 使用说明

### 连接钱包

1. 点击右上角的"连接钱包"按钮
2. 在弹出的对话框中选择您的钱包类型
3. 根据提示完成连接

### 切换网络

确保您的钱包连接到 **BSC (Binance Smart Chain)** 网络：
- **网络名称**: BSC Mainnet
- **RPC URL**: https://bsc-dataseed.binance.org/
- **Chain ID**: 56
- **符号**: BNB
- **区块浏览器**: https://bscscan.com

### 查看代币余额

连接钱包后：
1. 选择要交易的代币
2. 系统会自动显示该代币在您钱包中的余额
3. 点击"最大"按钮可以快速填入全部余额

---

## 常见问题

### Q: 为什么看不到我的钱包？
A: 请确保：
- 已安装对应的钱包插件（如 MetaMask）
- 钱包插件已启用
- 浏览器已刷新页面

### Q: 连接后余额显示为 0？
A: 可能原因：
- 确实没有该代币
- 网络选择错误（需要选择 BSC）
- 代币合约地址未添加到钱包

### Q: MetaMask 无法连接？
A: 尝试以下步骤：
1. 打开 MetaMask
2. 点击右上角账户图标
3. 选择"连接的网站"
4. 如果看到本站点，先断开
5. 刷新页面重新连接

### Q: 交易失败？
A: 检查：
- 余额是否充足
- Gas 费是否充足（需要 BNB）
- 网络是否拥堵
- 是否已授权代币（ERC20 代币需要先授权）

---

## 安全提示

⚠️ **重要安全提示**：

1. **永远不要**分享您的私钥或助记词
2. **确保**访问的是正确的网站域名
3. **仔细检查**每笔交易的详细信息
4. **建议**使用硬件钱包存储大额资产
5. **警惕**钓鱼网站和诈骗信息

---

## 技术支持

如有问题，请查看：
- 项目文档：`DOCUMENTATION.md`
- GitHub Issues：[项目地址]
- 联系开发者：holazz

