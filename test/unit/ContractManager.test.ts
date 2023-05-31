import { assert, expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { ContractManager } from "../../typechain-types";
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
    it("should revert if zero address is provided as owner", async () => {
      await expect(
        contractManager
          .connect(deployer)
          .createContract(
            ethers.constants.AddressZero,
            agreementTerms,
            parties,
            services
          )
      ).to.be.revertedWith("Owner address cannot be 0");
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

    it("should fail when trying to add a party to a non-existent contract", async function () {
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
        contractManager.connect(deployer).addParty(999, newParty)
      ).to.be.revertedWith("Contract does not exist");
    });
  });
  describe("addService", function () {
    it("should add a service to a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      const newService = {
        service: "new service",
        kpi: ["kpi1", "kpi2"],
      };

      await contractManager.addService(1, newService);

      const [, , contractServices] = await contractManager.getContract(
        deployer.address,
        1
      );

      assert.equal(
        contractServices[contractServices.length - 1].service,
        newService.service
      );
      assert.deepEqual(
        contractServices[contractServices.length - 1].kpi,
        newService.kpi
      );
    });

    it("should fail when non-owner tries to add a service", async function () {
      const newService = {
        service: "new service",
        kpi: ["kpi1", "kpi2"],
      };

      await expect(
        contractManager.connect(player).addService(1, newService)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should fail when trying to add a service to a non-existent contract", async function () {
      const newService = {
        service: "new service",
        kpi: ["kpi1", "kpi2"],
      };

      await expect(
        contractManager.connect(deployer).addService(999, newService)
      ).to.be.revertedWith("Contract does not exist");
    });
  });
  describe("deleteContract", function () {
    it("should delete a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      await contractManager.deleteContract(deployer.address, 1);

      // Check if the contract exists
      await expect(
        contractManager.getContract(deployer.address, 1)
      ).to.be.revertedWith("Contract not found");
    });

    it("should fail when non-owner tries to delete a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      await expect(
        contractManager.connect(player).deleteContract(deployer.address, 1)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should fail when trying to delete a non-existent contract", async function () {
      await expect(
        contractManager.connect(deployer).deleteContract(deployer.address, 999)
      ).to.be.revertedWith("Contract does not exist");
    });
  });
  describe("updateParty", function () {
    it("should update a party in a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      const updatedParty = {
        partyType: "updated type",
        entityType: "updated entity",
        fullName: "Jane Doe",
        streetName: "New street",
        streetNumber: "321",
        postalCode: "54321",
        city: "New city",
        country: "New country",
        signatoryName: "Jane Doe",
      };

      await contractManager.updateParty(1, 0, updatedParty);

      const [, contractParties] = await contractManager.getContract(
        deployer.address,
        1
      );

      const updatedPartyObj = {
        partyType: contractParties[0][0],
        entityType: contractParties[0][1],
        fullName: contractParties[0][2],
        streetName: contractParties[0][3],
        streetNumber: contractParties[0][4],
        postalCode: contractParties[0][5],
        city: contractParties[0][6],
        country: contractParties[0][7],
        signatoryName: contractParties[0][8],
      };

      assert.deepEqual(updatedPartyObj, updatedParty);
    });

    it("should fail when non-owner tries to update a party", async function () {
      const updatedParty = {
        partyType: "updated type",
        entityType: "updated entity",
        fullName: "Jane Doe",
        streetName: "New street",
        streetNumber: "321",
        postalCode: "54321",
        city: "New city",
        country: "New country",
        signatoryName: "Jane Doe",
      };

      await expect(
        contractManager.connect(player).updateParty(1, 0, updatedParty)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should fail when trying to update a party in a non-existent contract", async function () {
      const updatedParty = {
        partyType: "updated type",
        entityType: "updated entity",
        fullName: "Jane Doe",
        streetName: "New street",
        streetNumber: "321",
        postalCode: "54321",
        city: "New city",
        country: "New country",
        signatoryName: "Jane Doe",
      };

      await expect(
        contractManager.connect(deployer).updateParty(999, 0, updatedParty)
      ).to.be.revertedWith("Party index out of range");
    });
  });
  describe("updateService", function () {
    it("should update a service in a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      const updatedService = {
        service: "updated service",
        kpi: ["updated kpi1", "updated kpi2"],
      };

      await contractManager.updateService(1, 0, updatedService);

      const [, , contractServices] = await contractManager.getContract(
        deployer.address,
        1
      );

      const updatedServiceObj = {
        service: contractServices[0][0],
        kpi: contractServices[0].slice(1).flat(),
      };

      assert.deepEqual(updatedServiceObj, updatedService);
    });

    it("should fail when non-owner tries to update a service", async function () {
      const updatedService = {
        service: "updated service",
        kpi: ["updated kpi1", "updated kpi2"],
      };

      await expect(
        contractManager.connect(player).updateService(1, 0, updatedService)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should fail when trying to update a service in a non-existent contract", async function () {
      const updatedService = {
        service: "updated service",
        kpi: ["updated kpi1", "updated kpi2"],
      };

      await expect(
        contractManager.connect(deployer).updateService(999, 0, updatedService)
      ).to.be.revertedWith("Service index out of range");
    });

    it("should fail when trying to update a non-existent service in a contract", async function () {
      // Create contract first
      await contractManager
        .connect(deployer)
        .createContract(deployer.address, agreementTerms, parties, services);

      const updatedService = {
        service: "updated service",
        kpi: ["updated kpi1", "updated kpi2"],
      };

      await expect(
        contractManager.connect(deployer).updateService(1, 999, updatedService)
      ).to.be.revertedWith("Service index out of range");
    });
  });
  describe("transferOwnership", function () {
    it("should successfully transfer ownership to a new address", async () => {
      // Store the initial owner
      const initialOwner = await contractManager.getOwner();

      // Transfer ownership
      await contractManager.connect(deployer).transferOwnership(player.address);

      // Fetch the new owner
      const newOwner = await contractManager.getOwner();

      assert.notEqual(initialOwner, newOwner, "Owner should have changed");
      assert.equal(newOwner, player.address, "New owner should be player");
    });

    it("should revert if called by a non-owner address", async () => {
      // Try to call transferOwnership from a non-owner address
      await expect(
        contractManager.connect(player).transferOwnership(playerTwo.address)
      ).to.be.revertedWith("Caller is not the owner");
    });

    it("should revert if trying to set the owner to the zero address", async () => {
      // Try to call transferOwnership with the zero address
      await expect(
        contractManager
          .connect(deployer)
          .transferOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith("New owner is the zero address");
    });

    it("should emit an OwnershipTransferred event", async () => {
      // Expect the transferOwnership call to emit an OwnershipTransferred event
      await expect(
        contractManager.connect(deployer).transferOwnership(player.address)
      )
        .to.emit(contractManager, "OwnershipTransferred")
        .withArgs(deployer.address, player.address);
    });
  });
});
