import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import {
  ContractManager,
  MockToken,
  PaybackStaking,
} from "../../typechain-types";
import { agreementTerms, services, parties } from "../../utils/exampleContract";

describe("PaybackStaking", function () {
  let paybackStaking: PaybackStaking;
  let mockToken: MockToken;
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
    it("initializes the inactivity limit correctly", async () => {
      const limit = await paybackStaking.inactivityLimit();
      assert.equal("63113852", limit.toString());
    });
  });
});
