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
  const contractAddress = "0x78ef6c881dfd04f97b1107937c1f50cde2872674";
  const contract = await ethers.getContractAt(
    "ContractManager",
    contractAddress,
    signer
  );

  // Define your parameters here
  const agreementTerms = {
    duration: "for a fixed period",
    finalDate: "03/11/2023",
    earlyTerminationPossible: "yes",
    terminationPeriod: "13",
    currency: "usd",
    typeOfCompensation: "fixed price",
    fixedAmount: "12",
    includeTax: "including sales tax",
    courtJurisdiction: "Poland",
    intellectualPropertyOwner: "buyer",
    supplierReimbursement: "Reimbursement only after pre-approval of expenses",
  };

  const parties = [
    {
      partyType: "buyer",
      entityType: "Private person",
      fullName: "Szymon",
      streetName: "Jana Kazimierza",
      streetNumber: "51/160",
      postalCode: "01-267",
      city: "Warsaw",
      country: "Poland",
      signatoryName: "",
    },
    {
      partyType: "supplier",
      entityType: "Private person",
      fullName: "Wiktoria Flet",
      streetName: "Kasprzaka 3C",
      streetNumber: "3C",
      postalCode: "01-262",
      city: "Warsaw",
      country: "Poland",
      signatoryName: "",
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
      "06/10/2023",
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
