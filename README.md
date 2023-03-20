# VAIOT Single Asset Staking contract repo

This repo is for VAIOT's official single asset staking smart contract.

This is a hardhat repository. Before doing anything run

```bash
yarn
```

to install all the dependencies.

In order to properly run this project you must fill out .env file with the following variables:

```bash
MUMBAI_RPC_URL= // the rpc url for the mumbai testnet
GOERLI_RPC_URL= // the rpc url for the goerli testnet
PRIVATE_KEY= // private key of the account deploying the contracts
COINMARKETCAP_API_KEY= // coinmarketcap api key
POLYGONSCAN_API_KEY= // polygonscan api key
REPORT_GAS= // true or false
ETHERSCAN_API_KEY= // etherscan api key
```

To deploy the smart contract locally you need to write:

```bash
yarn hardhat deploy
```

Or if you wish to deploy to the mumbai testnet you must write:

```bash
yarn hardhat deploy --network mumbai
```

To run unit tests write:

```bash
yarn hardhat test
```
