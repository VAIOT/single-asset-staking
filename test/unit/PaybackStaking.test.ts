import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { ContractManager, PaybackStaking } from "../../typechain-types";
import { agreementTerms, services, parties } from "../../utils/exampleContract";

describe("PaybackStaking", function () {
  let paybackStaking: PaybackStaking;
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
    await deployments.fixture(["contract_manager"]);
    const paybackStakingDeployment = await deployments.get("PaybackStaking");
    paybackStaking = await ethers.getContractAt(
      "PaybackStaking",
      paybackStakingDeployment.address
    );
  });
});
