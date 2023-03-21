import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { StakingRewards, MockToken } from "../../typechain-types";
import { mine } from "@nomicfoundation/hardhat-network-helpers";

describe("StakingRewards", function () {
  let stakingRewards: StakingRewards;
  let stakingPlayer: StakingRewards;
  let stakingPlayerTwo: StakingRewards;
  let mockToken: MockToken;
  let mockTokenPlayer: MockToken;
  let mockTokenPlayerTwo: MockToken;
  let deployer: SignerWithAddress;
  let player: SignerWithAddress;
  let playerTwo: SignerWithAddress;
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests!";
    }
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    player = accounts[1];
    playerTwo = accounts[2];
    await deployments.fixture(["all"]);
    stakingRewards = await ethers.getContract("StakingRewards");
    mockToken = await ethers.getContract("MockToken");
    stakingPlayer = stakingRewards.connect(player);
    stakingPlayerTwo = stakingRewards.connect(playerTwo);
    mockTokenPlayer = mockToken.connect(player);
    mockTokenPlayerTwo = mockToken.connect(playerTwo);
  });

  describe("constructor", function () {
    it("initializes the contract correctly", async () => {
      const stakingTokenAddress = await stakingRewards.stakingToken();
      const rewardsTokenAddress = await stakingRewards.rewardsToken();
      assert.equal(stakingTokenAddress, mockToken.address);
      assert.equal(rewardsTokenAddress, mockToken.address);
    });
  });

  describe("changeStakeLimit", function () {
    it("initializes stake limit correctly", async () => {
      await stakingRewards.changeStakeLimit("1000");
      const stakeLimit = (await stakingRewards.getStakeLimit()).toString();
      assert.equal(stakeLimit, "1000");
    });
  });

  describe("changePoolLimit", function () {
    it("initializes pool limit correctly", async () => {
      await stakingRewards.changePoolLimit("1000");
      const poolLimit = (await stakingRewards.getPoolLimit()).toString();
      assert.equal(poolLimit, "1000");
    });
  });

  describe("notifyRewardAmount", function () {
    beforeEach(async () => {
      await mockToken.mint(deployer.address, "10000");
      await mockToken.mint(player.address, "10000");
    });
    it("only allows the owner to call the function", async () => {
      await expect(
        stakingPlayer.notifyRewardAmount("1000", "100")
      ).to.be.revertedWith("not authorized");
    });
    it("should setup duration correctly when calling the function for the first time", async () => {
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      const duration = (await stakingRewards.getDuration()).toString();
      assert.equal(duration, "100");
    });
    it("sets up the rewardRate correctly when the last reward pool has ended", async () => {
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await mine(100);
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      const rewardRate = (await stakingRewards.getRewardRate()).toString();
      assert.equal(rewardRate, "10");
    });
    it("correctly sets up rewardRate with remainingRewards from the last reward pool", async () => {
      await mockToken.approve(stakingRewards.address, "2000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await mine(49); // we mine 49 blocks, because it takes 1 block to notifyRewardAmount
      await stakingRewards.notifyRewardAmount("1000", "100");
      const rewardRate = (await stakingRewards.getRewardRate()).toString();
      assert.equal(rewardRate, "15");
    });
    it("reverts if rewardRate is equal to zero", async () => {
      await mockToken.approve(stakingRewards.address, "2000");
      await expect(
        stakingRewards.notifyRewardAmount("0", "100")
      ).to.be.revertedWith("amount must be greater than 0");
    });
    it("correctly sets up duration if calling the function for the second time", async () => {
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await mine(100);
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      const duration = (await stakingRewards.getDuration()).toString();
      assert.equal(duration, "100");
    });
    // NOTE: We mine 52 blocks to mock 60 seconds passing by
    // because we're doing 8 transactions, and each one of them add 1 second
    // that's why 52+8 transactions = 60 blocks (seconds)
    it("correctly sets up reward rate after resetting the lottery 2 times", async () => {
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await mine(48);
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await mine(4);
      await mockToken.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      const rewardRate = (await stakingRewards.getRewardRate()).toString();
      assert.equal(rewardRate, "24");
    });
  });
  describe("stake", () => {
    beforeEach(async () => {
      await mockToken.mint(deployer.address, "10000");
      await mockToken.mint(player.address, "1000");
      await mockToken.mint(playerTwo.address, "10000");
      await mockToken.approve(stakingRewards.address, "1000");
      await mockTokenPlayerTwo.approve(stakingRewards.address, "1000");
      await mockTokenPlayer.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await stakingRewards.changeStakeLimit("500");
      await stakingRewards.changePoolLimit("900");
    });
    it("reverts if amount is equal to zero", async () => {
      await expect(stakingPlayer.stake("0")).to.be.revertedWith("amount = 0");
    });
    it("reverts if you stake too much money", async () => {
      await expect(stakingPlayer.stake("1000")).to.be.revertedWith(
        "Too much staked!"
      );
    });
    it("reverts if maximum number of tokens in the pool has been reached", async () => {
      await stakingPlayer.stake("500");
      await expect(stakingPlayerTwo.stake("500")).to.be.revertedWith(
        "Maximum number of tokens staked has been reached!"
      );
    });
    it("contract correctly receives money from the staker", async () => {
      await stakingPlayer.stake("500");
      const contractBalance = (
        await mockToken.balanceOf(stakingRewards.address)
      ).toString();
      const playerBalance = (
        await mockToken.balanceOf(player.address)
      ).toString();
      assert.equal(contractBalance, "1500"); // 1500 = 1000 from owner + 500 from player
      assert.equal(playerBalance, "500"); // 500 = 1000 minted - 500 staked
    });
    it("correctly updates balanceOf the msg sender after staking two times", async () => {
      await stakingPlayer.stake("300");
      assert.equal(
        (await stakingRewards.balanceOf(player.address)).toString(),
        "300"
      );
      await stakingPlayer.stake("200");
      assert.equal(
        (await stakingRewards.balanceOf(player.address)).toString(),
        "500"
      );
    });
    it("correctly updates the totalSupply variable after staking", async () => {
      await stakingPlayer.stake("300");
      assert.equal((await stakingRewards.totalSupply()).toString(), "300");
      await stakingPlayerTwo.stake("500");
      assert.equal((await stakingRewards.totalSupply()).toString(), "800");
    });
  });
});
