<div align="center">
    <img src="assets/vaiotLogo.svg" alt="VAIOT Logo" width="400"/>
</div>

</br>
</br>

# VAIOT Single Asset Staking Contract

Welcome to the official repository for VAIOT's Single Asset Staking Smart Contract. This repository is dedicated to the development and maintenance of the staking contract using the Hardhat development environment, tailored for the Ethereum ecosystem.

## Installation

Begin by cloning the repository and installing the necessary dependencies:

```bash
git clone https://github.com/VAIOT/single-asset-staking.git
cd single-asset-staking
npm install
```

## Configuration

To properly configure the project, create a .env file in the root directory and include the following required variables:

```bash
MUMBAI_RPC_URL= # RPC URL for the Mumbai testnet
GOERLI_RPC_URL= # RPC URL for the Goerli testnet
PRIVATE_KEY= # Private key for contract deployment
COINMARKETCAP_API_KEY= # CoinMarketCap API key
POLYGONSCAN_API_KEY= # PolygonScan API key
REPORT_GAS= # true or false
ETHERSCAN_API_KEY= # Etherscan API key

```

## Smart Contract Overview

The StakingRewards contract allows users to stake ERC20 tokens and earn rewards. Key features include:

<ul>
    <li>Non-reentrancy for secure interactions.</li>
    <li>Adjustable staking and reward parameters.</li>
    <li>Automatic reward calculations based on the amount of users staking.</li>
    <li>Immediate or delayed withdrawal options with a fee or grace period, respectively.</li>
</ul>
Refer to the source code for detailed information on each function.

## Deployment

Deploy the smart contract either locally or on the Mumbai testnet using the Hardhat tool.

### Local Deployment

```bash
npx hardhat deploy
```

### Mumbai Testnet Deployment

```bash
npx hardhat deploy --network mumbai
```

## Testing

Run the unit tests to ensure code reliability:

```bash
npx hardhat test
```

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
