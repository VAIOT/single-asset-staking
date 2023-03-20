import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { StakingRewards, MockToken } from "../../typechain-types";

describe("StakingRewards", function () {
  let stakingRewards: StakingRewards;
  let mockToken: MockToken;
  let deployer: SignerWithAddress;
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests!";
    }
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    await deployments.fixture(["all"]);
    stakingRewards = await ethers.getContract("StakingRewards");
    mockToken = await ethers.getContract("MockToken");
  });

  describe("constructor", function () {
    it("initializes the contract correctly", async () => {
      const stakingTokenAddress = await stakingRewards.stakingToken();
      const rewardsTokenAddress = await stakingRewards.rewardsToken();
      assert.equal(stakingTokenAddress, mockToken.address);
      assert.equal(rewardsTokenAddress, mockToken.address);
    });
  });
});
