import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import verify from "../utils/verify";
import { networkConfig, developmentChains } from "../helper-hardhat-config";

const deployStakingContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let tokenAddress: string;
  let feeAddress: string;

  if (chainId === 31337 || chainId === 80001) {
    log("Test network detected!");
    const mockToken = await deployments.get("MockToken");
    tokenAddress = mockToken.address;
    feeAddress = deployer;
  } else {
    tokenAddress = networkConfig[network.name].stakingContractAddress!;
    feeAddress = networkConfig[network.name].feeCollectingAddress!;
  }

  log("----------------------------------------------------");
  log("Deploying Staking Contract and waiting for confirmations...");
  const stakingContract = await deploy("StakingRewards", {
    from: deployer,
    args: [tokenAddress, tokenAddress, feeAddress],
    log: true,
    waitConfirmations: networkConfig[network.name].blockConfirmations || 0,
  });
  log(`Staking contract deployed at ${stakingContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.POLYGONSCAN_API_KEY
  ) {
    await verify(stakingContract.address, [
      tokenAddress,
      tokenAddress,
      feeAddress,
    ]);
  }
};

export default deployStakingContract;
deployStakingContract.tags = ["all", "staking"];
