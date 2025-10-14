const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("AtomicSwap", function () {
  let atomicSwap;
  let owner;
  let user;
  let mockBinanceProxyRouter;
  let mockPancakeSwapRouter;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // 部署Mock合约
    const MockBinanceProxyRouter = await ethers.getContractFactory("MockBinanceProxyRouter");
    mockBinanceProxyRouter = await MockBinanceProxyRouter.deploy();

    const MockPancakeSwapV2Router = await ethers.getContractFactory("MockPancakeSwapV2Router");
    mockPancakeSwapRouter = await MockPancakeSwapV2Router.deploy();

    // 部署 AtomicSwap 合约，使用Mock合约地址
    const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
    atomicSwap = await AtomicSwap.deploy(mockBinanceProxyRouter.address, mockPancakeSwapRouter.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await atomicSwap.owner()).to.equal(owner.address);
    });

    it("Should set the correct router addresses", async function () {
      expect(await atomicSwap.BINANCE_PROXY_ROUTER()).to.equal(mockBinanceProxyRouter.address);
      expect(await atomicSwap.PANCAKESWAP_ROUTER()).to.equal(mockPancakeSwapRouter.address);
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to withdraw tokens", async function () {
      // 独立部署tokenA
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      await tokenA.mint(atomicSwap.address, ethers.utils.parseEther("100"));
      await atomicSwap.emergencyWithdraw(tokenA.address, ethers.utils.parseEther("100"));
      expect(await tokenA.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("100"));
    });

    it("Should not allow non-owner to withdraw tokens", async function () {
      // 独立部署tokenA
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      await tokenA.mint(atomicSwap.address, ethers.utils.parseEther("100"));
      await expect(
        atomicSwap.connect(user).emergencyWithdraw(tokenA.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Token Approval Tests", function () {
    const amount = ethers.utils.parseEther("100");

    it("Should allow user to approve tokens for AtomicSwap contract", async function () {
      // 独立部署tokenA
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      await tokenA.mint(user.address, amount);
      await tokenA.connect(user).approve(atomicSwap.address, amount);
      expect(await tokenA.allowance(user.address, atomicSwap.address)).to.equal(amount);
    });

    it("Should allow AtomicSwap contract to approve tokens for proxy router", async function () {
      // 重新部署tokenA和tokenB
      const TestToken = await ethers.getContractFactory("TestToken");
      const _tokenA = await TestToken.deploy("Token A", "TKNA");
      const _tokenB = await TestToken.deploy("Token B", "TKNB");
      await _tokenA.mint(user.address, ethers.utils.parseEther("1000"));
      await _tokenB.mint(user.address, ethers.utils.parseEther("1000"));
      // 只在此处转移owner权限
      await _tokenA.transferOwnership(mockBinanceProxyRouter.address);
      await _tokenB.transferOwnership(mockBinanceProxyRouter.address);
      await _tokenA.connect(user).approve(atomicSwap.address, amount);
      await atomicSwap.connect(user).executeAtomicSwapPair(
        _tokenA.address,
        _tokenB.address,
        amount,
        amount,
        amount
      );
      // mock下allowance不会归零，断言为amount
      expect(await _tokenA.allowance(atomicSwap.address, mockBinanceProxyRouter.address)).to.equal(amount);
    });

    it("Should revert if user has insufficient allowance", async function () {
      // 独立部署tokenA和tokenB
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      const tokenB = await TestToken.deploy("Token B", "TKNB");
      const smallAmount = ethers.utils.parseEther("10");
      await tokenA.mint(user.address, amount);
      await tokenB.mint(user.address, amount);
      await tokenA.connect(user).approve(atomicSwap.address, smallAmount);
      await expect(
        atomicSwap.connect(user).executeAtomicSwapPair(
          tokenA.address,
          tokenB.address,
          amount,
          amount,
          amount
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should handle approval reset correctly", async function () {
      // 独立部署tokenA和tokenB
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      const tokenB = await TestToken.deploy("Token B", "TKNB");
      await tokenA.mint(user.address, amount);
      await tokenB.mint(user.address, amount);
      // 先授权
      await tokenA.connect(user).approve(atomicSwap.address, amount);
      expect(await tokenA.allowance(user.address, atomicSwap.address)).to.equal(amount);
      // 重置授权
      await tokenA.connect(user).approve(atomicSwap.address, 0);
      expect(await tokenA.allowance(user.address, atomicSwap.address)).to.equal(0);
      // 尝试执行 swap 应该失败
      await expect(
        atomicSwap.connect(user).executeAtomicSwapPair(
          tokenA.address,
          tokenB.address,
          amount,
          amount,
          amount
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Swap Execution", function () {
    it("Should revert with invalid token addresses", async function () {
      // 独立部署tokenA和tokenB
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      const tokenB = await TestToken.deploy("Token B", "TKNB");
      const amount = ethers.utils.parseEther("100");
      await expect(
        atomicSwap.executeAtomicSwapPair(
          ethers.constants.AddressZero,
          tokenB.address,
          amount,
          amount,
          amount
        )
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should revert with invalid amounts", async function () {
      // 独立部署tokenA和tokenB
      const TestToken = await ethers.getContractFactory("TestToken");
      const tokenA = await TestToken.deploy("Token A", "TKNA");
      const tokenB = await TestToken.deploy("Token B", "TKNB");
      await expect(
        atomicSwap.executeAtomicSwapPair(
          tokenA.address,
          tokenB.address,
          0,
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("100")
        )
      ).to.be.revertedWith("Invalid input amount");
    });
  });
}); 