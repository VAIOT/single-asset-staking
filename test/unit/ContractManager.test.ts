import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { ContractManager } from "../../typechain-types";
import { mine } from "@nomicfoundation/hardhat-network-helpers";
import { agreementTerms, services, parties } from "../../utils/exampleContract";

describe("StakingRewards", function () {
  let contractManager: ContractManager;
  let deployer: SignerWithAddress;
  let player: SignerWithAddress;
  let playerTwo: SignerWithAddress;
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw "You need to be on a development chain to run tests!";
    }
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    player = accounts[1];
    playerTwo = accounts[2];
    await deployments.fixture(["contract_manager"]);
    contractManager = await ethers.getContract("ContractManager");
  });

  describe("constructor", function () {
    it("initializes the owner correctly", async () => {
      const owner = await contractManager.getOwner();
      assert.equal(deployer.address, owner);
    });
  });

  describe("createContract", function () {
    it("successfully creates a contract and emits an event", async () => {
      await expect(
        contractManager
          .connect(deployer)
          .createContract(deployer.address, agreementTerms, parties, services)
      )
        .to.emit(contractManager, "ContractCreated")
        .withArgs(1); // expects the contractId to be 1

      const [contractDetails, contractParties, contractServices] =
        await contractManager.getContract(deployer.address, 1);

      const latestBlock = await ethers.provider.getBlock("latest");
      assert.equal(contractDetails.id.toString(), "1");
      assert.equal(
        contractDetails.creationDate.toNumber(),
        latestBlock.timestamp
      );
      const contractAgreementTerms = {
        duration: contractDetails.agreementTerms.duration,
        finalDate: contractDetails.agreementTerms.finalDate,
        earlyTerminationPossible:
          contractDetails.agreementTerms.earlyTerminationPossible,
        terminationPeriod: contractDetails.agreementTerms.terminationPeriod,
        supplierReimbursement:
          contractDetails.agreementTerms.supplierReimbursement,
        intellectualPropertyOwner:
          contractDetails.agreementTerms.intellectualPropertyOwner,
        currency: contractDetails.agreementTerms.currency,
        fixedAmount: contractDetails.agreementTerms.fixedAmount,
        includeTax: contractDetails.agreementTerms.includeTax,
        typeOfCompensation: contractDetails.agreementTerms.typeOfCompensation,
      };

      assert.deepEqual(contractAgreementTerms, agreementTerms);

      // Convert the arrays into objects
      const contractPartyObjects = contractParties.map((partyArray) => {
        return {
          partyType: partyArray[0],
          entityType: partyArray[1],
          fullName: partyArray[2],
          streetName: partyArray[3],
          streetNumber: partyArray[4],
          postalCode: partyArray[5],
          city: partyArray[6],
          country: partyArray[7],
          signatoryName: partyArray[8],
        };
      });

      // Check the contract parties
      assert.lengthOf(contractPartyObjects, 2);
      assert.deepEqual(contractPartyObjects[0], parties[0]);
      assert.deepEqual(contractPartyObjects[1], parties[1]);

      // Convert the arrays into objects
      const contractServiceObjects = contractServices.map((serviceArray) => {
        return {
          service: serviceArray[0],
          kpi: serviceArray.slice(1).flat(), // Use .flat() to transform array of arrays into a flat array
        };
      });

      // Check the contract services
      assert.lengthOf(contractServiceObjects, 1);
      assert.deepEqual(contractServiceObjects[0], services[0]);
    });
    it("correctly updates the id of the contract", async () => {
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);
      const nextContractId = await contractManager.getNextContractId();
      assert.equal("2", nextContractId.toString());
    });

    it("should revert if called by a non-owner address", async () => {
      // Try to call createContract from a non-owner address
      await expect(
        contractManager
          .connect(player)
          .createContract(player.address, agreementTerms, parties, services)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should create contract with empty parties and services array", async () => {
      const emptyParties: typeof parties = [];
      const emptyServices: typeof services = [];

      await contractManager
        .connect(deployer)
        .createContract(
          deployer.address,
          agreementTerms,
          emptyParties,
          emptyServices
        );

      const [contractDetails, contractParties, contractServices] =
        await contractManager.getContract(deployer.address, 1);

      // Check if the parties and services array is empty
      assert.lengthOf(contractParties, 0);
      assert.lengthOf(contractServices, 0);
    });
  });
  describe("addParty", function () {
    it("should add a party to a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      const newParty = {
        partyType: "some type",
        entityType: "some entity",
        fullName: "John Doe",
        streetName: "Main street",
        streetNumber: "123",
        postalCode: "12345",
        city: "Some city",
        country: "Some country",
        signatoryName: "John Doe",
      };

      await contractManager.addParty(1, newParty);

      const [, contractParties] = await contractManager.getContract(
        deployer.address,
        1
      );

      assert.equal(
        contractParties[contractParties.length - 1].fullName,
        newParty.fullName
      );
    });

    it("should fail when non-owner tries to add a party", async function () {
      const newParty = {
        partyType: "some type",
        entityType: "some entity",
        fullName: "John Doe",
        streetName: "Main street",
        streetNumber: "123",
        postalCode: "12345",
        city: "Some city",
        country: "Some country",
        signatoryName: "John Doe",
      };

      await expect(
        contractManager.connect(player).addParty(1, newParty)
      ).to.be.revertedWith("Caller is not the owner");
    });
  });
});
