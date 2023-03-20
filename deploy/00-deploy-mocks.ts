import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import verify from "../utils/verify";
import { networkConfig } from "../helper-hardhat-config";

const deployMocks: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  if (chainId === 31337 || chainId === 80001) {
    log("Test network detected! Deploying mock ERC20 token...");
    const tokenContract = await deploy("MockToken", {
      contract: "MockToken",
      from: deployer,
      log: true,
      args: [],
      waitConfirmations: networkConfig[network.name].blockConfirmations || 0,
    });
    log(`Mocks Deployed to ${tokenContract.address}`);
    log("----------------------------------");
    if (chainId === 80001 && process.env.POLYGONSCAN_API_KEY) {
      await verify(tokenContract.address, []);
    }
  }
};
export default deployMocks;
deployMocks.tags = ["all", "mocks"];
