import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { networkConfig, developmentChains } from "../helper-hardhat-config";

const deployContractManager: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying ContractManager...");
  const contractManager = await deploy("ContractManager", {
    from: deployer,
    log: true,
  });

  log(`ContractManager deployed at ${contractManager.address}`);
};

export default deployContractManager;
deployContractManager.tags = ["all", "contract_manager"];
