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
  let stakingPlayerThree: StakingRewards;
  let mockToken: MockToken;
  let mockTokenPlayer: MockToken;
  let mockTokenPlayerTwo: MockToken;
  let mockTokenPlayerThree: MockToken;
  let deployer: SignerWithAddress;
  let player: SignerWithAddress;
  let playerTwo: SignerWithAddress;
  let playerThree: SignerWithAddress;
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests!";
    }
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    player = accounts[1];
    playerTwo = accounts[2];
    playerThree = accounts[3];
    await deployments.fixture(["all"]);
    const stakingRewardsDeployment = await deployments.get("StakingRewards");
    const mockTokenDeployment = await deployments.get("MockToken");

    stakingRewards = await ethers.getContractAt(
      "StakingRewards",
      stakingRewardsDeployment.address
    );
    mockToken = await ethers.getContractAt(
      "MockToken",
      mockTokenDeployment.address
    );
    stakingPlayer = stakingRewards.connect(player);
    stakingPlayerTwo = stakingRewards.connect(playerTwo);
    stakingPlayerThree = stakingRewards.connect(playerThree);
    mockTokenPlayer = mockToken.connect(player);
    mockTokenPlayerTwo = mockToken.connect(playerTwo);
    mockTokenPlayerThree = mockToken.connect(playerThree);
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
  describe("initializeWithdrawal", () => {
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
    it("reverts if user does not have any tokens to withdraw", async () => {
      await expect(stakingPlayer.initializeWithdrawal()).to.be.revertedWith(
        "Nothing to withdraw"
      );
    });
    it("reverts if withdrawal has already been initiated", async () => {
      await stakingPlayer.stake("100");
      await stakingPlayer.initializeWithdrawal();
      await expect(stakingPlayer.initializeWithdrawal()).to.be.revertedWith(
        "Withdrawal already initiated"
      );
    });
    it("correctly sets up the timestamp for the withdrawal", async () => {
      await stakingPlayer.stake("100");
      await stakingPlayer.initializeWithdrawal();
      const timestamp = await stakingRewards.withdrawalInitiated(
        playerTwo.address
      );
      assert.equal(timestamp.toString(), "0");
    });
  });
  describe("claimWithdrawal", () => {
    beforeEach(async () => {
      await mockToken.mint(deployer.address, "10000");
      await mockToken.mint(player.address, "1000");
      await mockToken.mint(playerTwo.address, "10000");
      await mockToken.approve(stakingRewards.address, "1000");
      await mockTokenPlayerTwo.approve(stakingRewards.address, "1000");
      await mockTokenPlayer.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await stakingPlayer.stake("100");
    });
    it("Reverts if withdrawal has not been initiated", async () => {
      await expect(stakingPlayer.claimWithdrawal("100")).to.be.revertedWith(
        "Withdrawal not initiated"
      );
    });
    it("Reverts if grace period has not yet passed", async () => {
      await stakingPlayer.initializeWithdrawal();
      await expect(stakingPlayer.claimWithdrawal("100")).to.be.revertedWith(
        "Grace period not yet passed"
      );
    });
    it("Reverts if want to withdraw too many tokens", async () => {
      await stakingPlayer.initializeWithdrawal();
      await mine(20000000);
      await expect(stakingPlayer.claimWithdrawal("200000")).to.be.revertedWith(
        "Withdrawal is too high!"
      );
    });
    it("Even with one second left you still can not withdraw the money", async () => {
      await stakingPlayer.initializeWithdrawal();
      await mine(604798); // 1 week without 1 second (1 transaction has been made so i have to mine -1 block)
      await expect(stakingPlayer.claimWithdrawal("100")).to.be.revertedWith(
        "Grace period not yet passed"
      );
    });
    it("correctly updates the balance of staker, totalSupply, withdrawalInitiated after withdrawing", async () => {
      await stakingPlayer.initializeWithdrawal();
      await mine(604800);
      await stakingPlayer.claimWithdrawal("100");
      const supply = await stakingPlayer.totalSupply();
      const balance = await stakingPlayer.balanceOf(player.address);
      const withdrawalInitiated = await stakingPlayer.withdrawalInitiated(
        player.address
      );
      assert.equal(supply.toString(), "0");
      assert.equal(balance.toString(), "0");
      assert.equal(withdrawalInitiated.toString(), "0");
    });
    it("correctly updates the balance of the staker after withdrawing", async () => {
      await stakingPlayer.initializeWithdrawal();
      await mine(604800);
      await stakingPlayer.claimWithdrawal("100");
      const balancePlayer = await mockTokenPlayer.balanceOf(player.address);
      const balanceContract = await mockToken.balanceOf(stakingRewards.address);
      assert.equal(balancePlayer.toString(), "1000");
      assert.equal(balanceContract.toString(), "1000"); // 1000 tokens that we deposited for rewards
    });
  });
  describe("withdrawReward", () => {
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
    it("correctly sets rewards of staker to zero", async () => {
      await stakingPlayer.stake("400");
      await mine(10);
      await stakingPlayer.withdrawReward();
      const reward = (await stakingRewards.rewards(player.address)).toString();
      assert.equal(reward, "0");
    });

    it("correctly withdraws rewards after 10 seconds", async () => {
      const begginingPlayerBalance = (
        await mockToken.balanceOf(player.address)
      ).toString();
      const begginingContractBalance = (
        await mockToken.balanceOf(stakingRewards.address)
      ).toString();
      await stakingPlayer.stake("400");
      await mine(10);
      await stakingPlayer.stake("100");
      const reward = (await stakingRewards.rewards(player.address)).toString();
      assert.equal(reward, "110"); // 11 blocks have passed so 11*10 = 110
      await stakingPlayer.withdrawReward();
      const endingContractBalance = (
        await mockToken.balanceOf(stakingRewards.address)
      ).toString();
      const endingPlayerBalance = (
        await mockToken.balanceOf(player.address)
      ).toString();
      assert.equal(
        parseInt(begginingPlayerBalance) - 400 - 100 + 120,
        parseInt(endingPlayerBalance)
      ); // we add 120 because withdrawingRewards is an additional block
      assert.equal(
        parseInt(begginingContractBalance) + 400 + 100 - 120,
        parseInt(endingContractBalance)
      );
    });
  });
  describe("earned", () => {
    beforeEach(async () => {
      await mockToken.mint(deployer.address, "10000");
      await mockToken.mint(player.address, "1000");
      await mockToken.mint(playerTwo.address, "10000");
      await mockToken.mint(playerThree.address, "10000");
      await mockToken.approve(stakingRewards.address, "10000");
      await mockTokenPlayer.approve(stakingRewards.address, "1000");
      await mockTokenPlayerTwo.approve(stakingRewards.address, "1000");
      await mockTokenPlayerThree.approve(stakingRewards.address, "1000");
      await stakingRewards.notifyRewardAmount("1000", "100");
      await stakingRewards.changeStakeLimit("500");
      await stakingRewards.changePoolLimit("900");
    });
    it("properly calculates rewards with one, two and three stakers", async () => {
      // one staker
      await stakingPlayer.stake("400");
      await mine(10);
      const reward = (await stakingRewards.earned(player.address)).toString();
      assert.equal(reward, "100");
      // adding another staker after 10 seconds
      await stakingPlayerTwo.stake("100");
      await mine(10); // another 10 seconds passing
      const rewardAfter21Seconds = (
        await stakingRewards.earned(player.address)
      ).toString();
      assert.equal(rewardAfter21Seconds, "190"); // 110 reward from 11 seconds * 10 and 80 tokens from 10 * 8
      // adding a third staker after 11 seconds of one staker and 11 seconds of 2 stakers
      await stakingPlayerThree.stake("100");
      await mine(10);
      const rewardAfter33Seconds = (
        await stakingRewards.earned(player.address)
      ).toString();
      assert.equal(rewardAfter33Seconds, "264"); // 190 + 8 + 10 * 4/6 * 10 rounded down
    });
    it("properly calculates rewards after ending the pool reward early", async () => {
      await stakingPlayer.stake("400");
      await mine(10); // 10 seconds pass of rewards for one staker + 1 second of no stakers
      await stakingRewards.notifyRewardAmount("1000", "100"); // we start another reward pool
      await mine(10);
      const reward = (await stakingRewards.earned(player.address)).toString();
      assert.equal(reward, "290"); // 100 tokens from the first pool + 19 * 10 from the second pool
    });
  });
});
