const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 获取环境变量中的路由器地址
  const binanceProxyRouter = process.env.BINANCE_PROXY_ROUTER;
  const pancakeSwapRouter = process.env.PANCAKESWAP_ROUTER;

  if (!binanceProxyRouter || !pancakeSwapRouter) {
    throw new Error("Router addresses not found in environment variables");
  }

  // 部署 AtomicSwap 合约
  const AtomicSwap = await hre.ethers.getContractFactory("AtomicSwap");
  const atomicSwap = await AtomicSwap.deploy(binanceProxyRouter, pancakeSwapRouter);

  // 等待部署完成
  await atomicSwap.deployed();
  console.log("AtomicSwap deployed to:", atomicSwap.address);

  // 等待几个区块确认
  console.log("Waiting for block confirmations...");
  await atomicSwap.deployTransaction.wait(5);

  // 验证合约
  if (hre.network.name !== "hardhat") {
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: atomicSwap.address,
        constructorArguments: [binanceProxyRouter, pancakeSwapRouter],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 