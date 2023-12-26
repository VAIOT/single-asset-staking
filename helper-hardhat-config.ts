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
    stakingContractAddress: "0xD13cfD3133239a3c73a9E535A5c4DadEE36b395c",
    rewardContractAddress: "0xD13cfD3133239a3c73a9E535A5c4DadEE36b395c",
    feeCollectingAddress: "0x4FCD8Ba9AD619Db0e8116f363c2C71F1F146432A",
    initialOwner: "0xA6261cFbB4cAe2369ab0Ce912D20ed2fC0B9fF0B",
    blockConfirmations: 6,
  },
};

export const developmentChains = ["hardhat", "localhost"];
