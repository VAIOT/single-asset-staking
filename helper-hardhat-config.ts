export interface networkConfigItem {
  stakingContractAddress?: string;
  rewardContractAddress?: string;
  feeCollectingAddress?: string;
  initialOwner?: string;
  blockConfirmations?: number;
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
  localhost: {},
  hardhat: {},
  mumbai: {
    blockConfirmations: 6,
  },
  polygon: {
    stakingContractAddress: "", // Staking contract address
    rewardContractAddress: "", // Rewards contract address
    feeCollectingAddress: "", // Address that will be collecting fees
    initialOwner: "", // Initial owner of the smart contract
    blockConfirmations: 6,
  },
};

export const developmentChains = ["hardhat", "localhost"];
