import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { MockToken, PaybackStaking } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PaybackStaking", function () {
  let paybackStaking: PaybackStaking;
  let mockToken: MockToken;
  let deployer: SignerWithAddress;
  let player: SignerWithAddress;
  let playerTwo: SignerWithAddress;
  let playerThree: SignerWithAddress;
  let playerFour: SignerWithAddress;
  let playerFive: SignerWithAddress;

  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests!";
    }
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    player = accounts[1];
    playerTwo = accounts[2];
    playerThree = accounts[3];
    playerFour = accounts[4];
    playerFive = accounts[5];
    await deployments.fixture(["payback"]);
    const paybackStakingDeployment = await deployments.get("PaybackStaking");
    const mockTokenDeployment = await deployments.get("MockToken");
    paybackStaking = await ethers.getContractAt(
      "PaybackStaking",
      paybackStakingDeployment.address
    );
    mockToken = await ethers.getContractAt(
      "MockToken",
      mockTokenDeployment.address
    );
  });

  describe("constructor", () => {
    it("initializes the owner of the contract correctly", async () => {
      const owner = await paybackStaking.owner();
      assert.equal(deployer.address, owner);
    });
    it("initializes the APY correctly", async () => {
      const apy = (await paybackStaking.APY()).toString();
      assert.equal("10", apy);
    });
    it("initializes the token address correctly", async () => {
      const tokenAddress = await paybackStaking.stakingToken();
      assert.equal(tokenAddress, mockToken.address);
    });
    it("should have the correct inactivity limit set", async function () {
      const expectedLimit = 2 * 365 * 24 * 60 * 60; // 2 years in seconds
      const actualLimit = await paybackStaking.inactivityLimit();
      expect(actualLimit.toString()).to.equal(expectedLimit.toString());
    });
  });

  describe("refillTokenPool", () => {
    it("allows the owner to refill the token pool", async function () {
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.mint(deployer.address, refillAmount);
      await mockToken.approve(paybackStaking.address, refillAmount);
      await paybackStaking.refillTokenPool(refillAmount);

      const tokenPool = await paybackStaking.tokenPool();
      expect(tokenPool).to.equal(refillAmount);
    });
    it("does not allow non-owners to refill the token pool", async function () {
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.connect(player).mint(player.address, refillAmount);

      await mockToken
        .connect(player)
        .approve(paybackStaking.address, refillAmount);

      await expect(
        paybackStaking.connect(player).refillTokenPool(refillAmount)
      ).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
    it("correctly updates the token pool amount after refill", async function () {
      const initialTokenPool = await paybackStaking.tokenPool();
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.mint(deployer.address, refillAmount);
      await mockToken.approve(paybackStaking.address, refillAmount);
      await paybackStaking.refillTokenPool(refillAmount);

      const finalTokenPool = await paybackStaking.tokenPool();
      expect(finalTokenPool).to.equal(initialTokenPool.add(refillAmount));
    });
    it("emits a TokenPoolRefilled event when the pool is refilled", async function () {
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.mint(deployer.address, refillAmount);
      await mockToken.approve(paybackStaking.address, refillAmount);

      await expect(paybackStaking.refillTokenPool(refillAmount))
        .to.emit(paybackStaking, "TokenPoolRefilled")
        .withArgs(refillAmount);
    });
    it("handles refilling the pool with zero amount", async function () {
      const refillAmount = ethers.utils.parseEther("0");
      await mockToken.mint(deployer.address, refillAmount);
      await mockToken.approve(paybackStaking.address, refillAmount);

      await expect(paybackStaking.refillTokenPool(refillAmount)).to.not.be
        .reverted;
    });
    it("does not allow refilling beyond the owner's token balance", async function () {
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.approve(paybackStaking.address, refillAmount);
      await expect(
        paybackStaking.refillTokenPool(refillAmount)
      ).to.be.revertedWith("ERC20InsufficientBalance");
    });
    it("does not allow refilling if the contract is not approved to transfer tokens", async function () {
      const refillAmount = ethers.utils.parseEther("1000");
      await mockToken.mint(deployer.address, refillAmount);
      await expect(
        paybackStaking.refillTokenPool(refillAmount)
      ).to.be.revertedWith("ERC20InsufficientAllowance");
    });
  });
  describe("depositForUser and withdraw", function () {
    it("allows the owner to deposit tokens for a user", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("10");
      await mockToken.mint(deployer.address, depositAmount);

      const deployerBalance = await mockToken.balanceOf(deployer.address);
      expect(deployerBalance).to.equal(depositAmount);

      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);

      const poolBalance = await paybackStaking.tokenPool();
      expect(poolBalance).to.equal(depositAmount);

      await paybackStaking.depositForUser(player.address, stakedAmount);
      const userInfo = await paybackStaking.getUserInfo(player.address);
      expect(userInfo.balance).to.equal(stakedAmount);
    });

    it("does not allow non-owners to deposit tokens for a user", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      await expect(
        paybackStaking
          .connect(player)
          .depositForUser(playerTwo.address, depositAmount)
      ).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
    it("emits a Deposited event when tokens are deposited for a user", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("10");

      await mockToken.approve(paybackStaking.address, depositAmount);
      await mockToken.mint(deployer.address, depositAmount);

      await paybackStaking.refillTokenPool(depositAmount);
      await expect(paybackStaking.depositForUser(player.address, stakedAmount))
        .to.emit(paybackStaking, "Deposited")
        .withArgs(player.address, stakedAmount);
    });
    it("does not allow depositing if the token pool has insufficient funds", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      await mockToken.approve(paybackStaking.address, depositAmount);
      await mockToken.mint(deployer.address, depositAmount);
      await expect(
        paybackStaking.depositForUser(player.address, depositAmount)
      ).to.be.revertedWith(
        "Insufficient tokens in pool to cover potential max rewards"
      );
    });
    it("correctly adds a new user when depositing for the first time", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("10");

      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      const currentBlockTime = (await ethers.provider.getBlock("latest"))
        .timestamp;
      const userInfo = await paybackStaking.getUserInfo(playerTwo.address);

      expect(userInfo.exists).to.be.true;
      expect(userInfo.balance).to.equal(stakedAmount);
      expect(userInfo.depositTime).to.be.at.least(currentBlockTime);
      expect(userInfo.lastUpdateTime).to.be.at.least(currentBlockTime);
    });
    it("handles depositing zero amount for a user", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const zeroAmount = ethers.utils.parseEther("0");

      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);

      await expect(paybackStaking.depositForUser(playerTwo.address, zeroAmount))
        .to.not.be.reverted;

      const userInfo = await paybackStaking.getUserInfo(playerTwo.address);
      expect(userInfo.balance).to.equal(zeroAmount);
    });
    it("does not allow depositing more than the available token pool", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const excessAmount = ethers.utils.parseEther("200");

      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);

      await expect(
        paybackStaking.depositForUser(playerTwo.address, excessAmount)
      ).to.be.revertedWith(
        "Insufficient tokens in pool to cover potential max rewards"
      );
    });
    it("correctly calculates rewards over a year after another deposit", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("10");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);

      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Simulate the passage of one year
      await time.increase(TIME_IN_A_YEAR);

      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // After one year, calculate the expected balance

      const expectedBalance = ethers.utils.parseEther("21");

      await paybackStaking.connect(playerTwo).withdraw();

      const userBalance = await mockToken
        .connect(playerTwo)
        .balanceOf(playerTwo.address);

      expect(userBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );
    });
    it("resets the withdrawal period on subsequent deposits, gives out proper rewards and does not allow users to withdraw twice", async function () {
      const depositAmount = ethers.utils.parseEther("50");
      const additionalAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60; // seconds in a year

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, additionalAmount);

      // Fast-forward time 1 year
      await time.increase(TIME_IN_A_YEAR);

      // Make another deposit of 20 tokens - now the user should already have 2 tokens as rewards assuming 10% APY
      await paybackStaking.depositForUser(playerTwo.address, additionalAmount);

      // Increase time to test if the withdrawal period has reset by 1.5 years
      await time.increase(TIME_IN_A_YEAR * 1.5);

      // Withdraw tokens - now the user should have his initial 40 tokens + 2 tokens from the first year + 6 tokens from the next 1.5 years
      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      // Check if user info in the smart contract has been properly updated

      const userInfo = await paybackStaking.getUserInfo(playerTwo.address);

      expect(userInfo.exists).to.be.false;
      expect(userInfo.balance).to.equal(0);
      expect(userInfo.depositTime).to.be.at.least(0);
      expect(userInfo.lastUpdateTime).to.be.equal(0);

      // Check balance of user

      const playerBalance = await mockToken.balanceOf(playerTwo.address);

      const expectedBalance = ethers.utils.parseEther("48");

      // We are expecting that after this whole period the use will withdraw around 48 tokens
      expect(playerBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );

      await expect(
        paybackStaking.connect(playerTwo).withdraw()
      ).to.be.revertedWith("User does not exist");
    });
    it("allows to deposit again after withdrawal and properly calculates and cashes out rewards", async () => {
      const depositAmount = ethers.utils.parseEther("50");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60; // seconds in a year

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 1 year
      await time.increase(TIME_IN_A_YEAR);

      // Withdraw tokens
      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      // Check balance of user

      const playerBalance = await mockToken.balanceOf(playerTwo.address);

      const expectedBalance = ethers.utils.parseEther("22");

      // We are expecting that after this whole period the use will withdraw around 22 tokens
      expect(playerBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );

      // Deposit tokens again for the user
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 1.5 years
      await time.increase(TIME_IN_A_YEAR * 1.5);

      // Withdraw tokens
      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      const newExpectedBalance = ethers.utils.parseEther("45");

      const newPlayerBalance = await mockToken.balanceOf(playerTwo.address);

      // Checking if the new balance is 22 tokens + new 23 tokens
      expect(newPlayerBalance).to.be.closeTo(
        newExpectedBalance,
        ethers.utils.parseEther("0.1")
      );
    });
    it("correctly handles deposits from multiple users", async function () {
      const depositAmount = ethers.utils.parseEther("50");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      // Make initial deposit of 20 tokens for both accounts
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);
      await paybackStaking.depositForUser(player.address, stakedAmount);

      // Fast forward 1 year
      await time.increase(TIME_IN_A_YEAR);

      // Withdraw tokens on both accounts
      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      await expect(paybackStaking.connect(player).withdraw()).to.not.be
        .reverted;

      const expectedBalance = ethers.utils.parseEther("22");

      // Check if both accounts received roughly 22 tokens
      const playerBalance = await mockToken.balanceOf(player.address);
      const playerTwoBalance = await mockToken.balanceOf(playerTwo.address);

      expect(playerBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );

      expect(playerTwoBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );

      // Check if total amount staked is 0
      const totalStaked = await paybackStaking.totalStaked();
      expect(totalStaked).to.be.equal(0);

      // Check if 6 tokens are left after distribution
      const expectedPool = ethers.utils.parseEther("6");
      const poolLeft = await paybackStaking.tokenPool();
      expect(expectedPool).to.be.closeTo(
        poolLeft,
        ethers.utils.parseEther("0.1")
      );
    });
    it("does not allow to deposit more tokens than tokenPool from multiple users", async () => {
      const tokenPool = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("20");

      // Make initial deposit of 20 tokens for both accounts
      await mockToken.mint(deployer.address, tokenPool);
      await mockToken.approve(paybackStaking.address, tokenPool);
      await paybackStaking.refillTokenPool(tokenPool);
      await paybackStaking.depositForUser(player.address, stakedAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);
      await paybackStaking.depositForUser(playerThree.address, stakedAmount);
      await paybackStaking.depositForUser(playerFour.address, stakedAmount);
      await expect(
        paybackStaking.depositForUser(playerFive.address, stakedAmount)
      ).to.be.revertedWith(
        "Insufficient tokens in pool to cover potential max rewards"
      );
    });
    it("does not allow users to withdraw funds after inactivity period has passed", async () => {
      const depositAmount = ethers.utils.parseEther("50");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 2 years
      await time.increase(TIME_IN_A_YEAR * 2);

      await expect(
        paybackStaking.connect(playerTwo).withdraw()
      ).to.be.revertedWith("Withdrawal period expired");
    });
    it("allows user to withdraw still after 1 year 11 months and 29 days", async () => {
      const depositAmount = ethers.utils.parseEther("50");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 2 years
      await time.increase(TIME_IN_A_YEAR * 1.99);

      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;
    });
    it("correctly calculates rewards for new deposit after the first one expired", async () => {
      const depositAmount = ethers.utils.parseEther("50");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 2 years
      await time.increase(TIME_IN_A_YEAR * 2);

      // We want to revert this withdrawal, since its past the limit

      await expect(
        paybackStaking.connect(playerTwo).withdraw()
      ).to.be.revertedWith("Withdrawal period expired");

      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);
      await time.increase(TIME_IN_A_YEAR);

      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      const expectedBalance = ethers.utils.parseEther("22");

      const playerBalance = await mockToken.balanceOf(playerTwo.address);

      // Checking if the new balance is 22 tokens since he staked 20 tokens for a year
      expect(playerBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );

      // Check user info if it has been reset properly after withdrawing

      const userInfo = await paybackStaking.getUserInfo(playerTwo.address);

      expect(userInfo.exists).to.be.false;
      expect(userInfo.balance).to.equal(0);
      expect(userInfo.depositTime).to.be.equal(0);
      expect(userInfo.lastUpdateTime).to.be.equal(0);
    });
    it("correctly blocks withdrawal after inactivity period passed, allows to deposit again, blocks withdrawal after long inactivity again, allows to deposit again and withdraw", async () => {
      const depositAmount = ethers.utils.parseEther("100");
      const stakedAmount = ethers.utils.parseEther("20");
      const TIME_IN_A_YEAR = 365 * 24 * 60 * 60;

      // Make initial deposit of 20 tokens
      await mockToken.mint(deployer.address, depositAmount);
      await mockToken.approve(paybackStaking.address, depositAmount);
      await paybackStaking.refillTokenPool(depositAmount);
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 2 years
      await time.increase(TIME_IN_A_YEAR * 2);

      // Should revert since 2 years passed
      await expect(
        paybackStaking.connect(playerTwo).withdraw()
      ).to.be.revertedWith("Withdrawal period expired");

      // Waiting another year
      await time.increase(TIME_IN_A_YEAR);

      // Staking again
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Fast-forward time 2 years
      await time.increase(TIME_IN_A_YEAR * 2);

      // Should revert since 2 years passed
      await expect(
        paybackStaking.connect(playerTwo).withdraw()
      ).to.be.revertedWith("Withdrawal period expired");

      // Staking again
      await paybackStaking.depositForUser(playerTwo.address, stakedAmount);

      // Waiting a month
      await time.increase(TIME_IN_A_YEAR / 12);

      // Since only a month passed it should not be reverted
      await expect(paybackStaking.connect(playerTwo).withdraw()).to.not.be
        .reverted;

      // Checking if user has a good amount of tokens 20 + 1/12 * 2
      const expectedBalance = ethers.utils.parseEther(
        (20 + (1 / 12) * 2).toString()
      );

      const playerBalance = await mockToken.balanceOf(playerTwo.address);

      expect(playerBalance).to.be.closeTo(
        expectedBalance,
        ethers.utils.parseEther("0.1")
      );
    });
  });
  describe("apy", () => {
    it.only("updates the APY correctly", async function () {
      const newAPY = 20;
      await paybackStaking.setAPY(newAPY);
      const currentAPY = await paybackStaking.APY();
      expect(currentAPY).to.equal(newAPY);
    });
  });
});
