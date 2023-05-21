const { ethers } = require("hardhat");
import { Network, JsonRpcProvider } from "@ethersproject/providers";
import { ConnectionInfo } from "@ethersproject/web";
require("dotenv").config();

const POLYGONEDGE_RPC_URL =
  process.env.POLYGONEDGE_RPC_URL === undefined
    ? ""
    : process.env.POLYGONEDGE_RPC_URL;

class CustomJsonRpcProvider extends JsonRpcProvider {
  async detectNetwork(): Promise<Network> {
    return new Promise((resolve) => {
      resolve({
        chainId: 112233,
        name: "polygonEdge",
      });
    });
  }
}

async function main() {
  const connection: ConnectionInfo = {
    url: POLYGONEDGE_RPC_URL,
    headers: {
      Authorization: `Basic ${process.env.KALEIDO_AUTHORIZATION}`,
    },
  };

  const provider = new CustomJsonRpcProvider(connection);

  // Initialize the signer
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Instantiate the contract
  const contractAddress = "0x8ff0a5ddcb2842b6c9812f06ac83fc8836291bdb";
  const contract = await ethers.getContractAt(
    "ContractManager",
    contractAddress,
    signer
  );

  // Define your parameters here
  const agreementTerms = {
    duration: "1 year",
    finalDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    earlyTerminationPossible: "Yes",
    terminationPeriod: 30,
    supplierReimbursement: "No",
    intellectualPropertyOwner: "Party B",
    currency: "USD",
    fixedAmount: 1000,
    includeTax: "No",
    typeOfCompensation: "Fixed",
  };

  const parties = [
    {
      partyType: "Party A",
      entityType: "Individual",
      fullName: "John Doe",
      streetName: "Baker Street",
      streetNumber: "221B",
      postalCode: "NW1 6XE",
      city: "London",
      country: "United Kingdom",
      signatoryName: "John Doe",
    },
    {
      partyType: "Party B",
      entityType: "Company",
      fullName: "ACME Inc.",
      streetName: "Fleet Street",
      streetNumber: "10",
      postalCode: "EC4A 2AB",
      city: "London",
      country: "United Kingdom",
      signatoryName: "CEO ACME",
    },
  ];

  const services = [
    {
      service: "Software Development",
      kpi: ["Delivery on time", "Code quality"],
    },
  ];

  try {
    // Call the contract's createContract function
    const transaction = await contract.createContract(
      "0xD6D8903F2E900b176c5915A68144E4bd664aA153",
      agreementTerms,
      parties,
      services
    );

    // Wait for the transaction to be mined
    const receipt = await transaction.wait();
    console.log(receipt);
  } catch (error) {
    console.error(error);
  }
}

main().catch(console.error);
