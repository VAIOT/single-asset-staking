import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import verify from "../utils/verify";

const deployPaybackStakingContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let tokenAddress: string;
  let initialOwner: string;

  if (chainId === 31337 || chainId === 80001) {
    log("Test network detected!");
    const mockToken = await deployments.get("MockToken");
    tokenAddress = mockToken.address;
    initialOwner = deployer; // address of the owner on testnet
  } else {
    tokenAddress = networkConfig[network.name].stakingContractAddress!;
    initialOwner = networkConfig[network.name].initialOwner!;
  }

  log("----------------------------------------------------");
  log("Deploying Payback Staking Contract and waiting for confirmations...");

  const initialApy = 10; // initial APY
  const inactivityLimit = 2 * 365 * 24 * 60 * 60; // 2 years in seconds

  const contractArgs = [
    initialApy,
    tokenAddress,
    initialOwner,
    inactivityLimit,
  ];

  const paybackContract = await deploy("PaybackStaking", {
    from: deployer,
    args: contractArgs,
    log: true,
    waitConfirmations: networkConfig[network.name].blockConfirmations || 0,
  });
  log(`Payback Staking contract deployed at ${paybackContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.POLYGONSCAN_API_KEY
  ) {
    await verify(paybackContract.address, contractArgs);
  }
};

export default deployPaybackStakingContract;
deployPaybackStakingContract.tags = ["all", "payback"];
