# Binance Atomic Swap

一个在 Binance Smart Chain (BSC) 上实现原子化双向 Swap 交易的智能合约项目。该项目通过指定的代理路由器执行交易，以最小化因交易时间差导致的价格滑点损耗。

## 功能特点

- 在单笔交易中完成双向 Swap 操作
- 支持任意 ERC20 代币对的交易
- 通过代理路由器执行交易，确保交易原子性
- 内置滑点保护机制
- 支持紧急提取功能

## 技术栈

- Solidity ^0.8.0
- Hardhat
- Ethers.js
- Waffle/Chai (测试)

## 合约地址

- Binance DEX 代理路由器: `0xb300000b72DEAEb607a12d5f54773D1C19c7028d`
- PancakeSwap V2 Router: 0x5efc784D444126ECc05f22c49FF3FBD7D9F4868a

## 安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/BinanceAtomicSwap.git
cd BinanceAtomicSwap
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的私钥和 BSC 节点 URL
```

## 使用

1. 编译合约

```bash
npx hardhat compile
```

2. 运行测试

```bash
npx hardhat test
```

3. 部署合约

```bash
npx hardhat run scripts/deploy.js --network bsc
```

## 合约接口

### AtomicSwap.sol

主要合约，提供以下功能：

- `executeAtomicSwapPair`: 执行原子化双向 Swap
- `emergencyWithdraw`: 紧急提取代币
- `getBalance`: 查询合约余额

## 安全考虑

- 所有交易都有最小返回数量保护
- 支持紧急提取功能
- 使用 SafeMath 进行数学运算
- 实现了重入锁保护

## 测试

项目包含完整的测试套件，覆盖以下场景：

- 正常 Swap 流程
- 滑点保护
- 错误处理
- 紧急提取功能

## 贡献

欢迎提交 Pull Request 和 Issue。

## 许可证

MIT
