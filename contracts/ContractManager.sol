// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract ContractManager {
  // ============= VARIABLES ============
  uint256 private nextContractId = 1;
  address private deployer;

  // ============= STRUCTS ============
  struct Service {
    string service;
    string[] kpi;
  }

  struct AgreementTerms {
    string duration;
    string finalDate;
    string earlyTerminationPossible;
    string terminationPeriod;
    string supplierReimbursement;
    string intellectualPropertyOwner;
    string currency;
    string fixedAmount;
    string includeTax;
    string typeOfCompensation;
    string courtJurisdiction;
  }

  struct Party {
    string partyType;
    string entityType;
    string fullName;
    string streetName;
    string streetNumber;
    string postalCode;
    string city;
    string country;
    string signatoryName;
  }

  struct Contract {
    uint256 id;
    string effectiveDate;
    uint256 creationDate;
    AgreementTerms agreementTerms;
  }

  struct ContractOverview {
    uint256 id;
    string partyAName;
    string partyBName;
    uint256 creationDate;
  }

  // ============= MAPPINGS ============

  mapping(address => Contract[]) private contracts;
  mapping(uint256 => Party[]) private contractParties;
  mapping(uint256 => Service[]) private contractServices;

  // ============= EVENTS ============

  event ContractCreated(uint contractId);
  event OwnershipTransferred(address oldOwner, address newOwner);

  // ============= CONSTRUCTOR ============

  constructor() {
    deployer = msg.sender;
  }

  // ============= MODIFIERS ============

  modifier onlyOwner() {
    require(msg.sender == deployer, "Caller is not the owner");
    _;
  }

  // ============= MAIN FUNCTIONS ============

  /// @notice Function that allows you to create a new contract.
  /// @param _owner - address of the account that we are creating the contract for
  /// @param _agreementTerms - terms of the aggreement
  /// @param _parties - parties of the aggreement
  /// @param _services - services supplied in the aggreement

  function createContract(
    address _owner,
    string memory _effectiveDate,
    AgreementTerms memory _agreementTerms,
    Party[] memory _parties,
    Service[] memory _services
  ) public onlyOwner returns (uint) {
    require(_owner != address(0), "Owner address cannot be 0");
    contracts[_owner].push(
      Contract({
        id: nextContractId,
        effectiveDate: _effectiveDate,
        creationDate: block.timestamp,
        agreementTerms: _agreementTerms
      })
    );

    for (uint i = 0; i < _parties.length; i++) {
      contractParties[nextContractId].push(_parties[i]);
    }

    for (uint i = 0; i < _services.length; i++) {
      contractServices[nextContractId].push(_services[i]);
    }

    uint createdContractId = nextContractId;
    nextContractId++;
    emit ContractCreated(createdContractId);
    return createdContractId;
  }

  /// @notice Function that allows you to add parties to an existing contract
  /// @param _contractId - id of the contract we are adding a party to
  /// @param _party - party that we wish to add

  function addParty(uint256 _contractId, Party memory _party) public onlyOwner {
    require(contractParties[_contractId].length > 0, "Contract does not exist");
    contractParties[_contractId].push(_party);
  }

  /// @notice Function that allows you to add services to an existing contract
  /// @param _contractId - id of the contract we are adding a party to
  /// @param _service - service that we wish to add

  function addService(
    uint256 _contractId,
    Service memory _service
  ) public onlyOwner {
    require(contractParties[_contractId].length > 0, "Contract does not exist");
    contractServices[_contractId].push(_service);
  }

  /// @notice Function that allows you to add delete a contract
  /// @param _contractId - id of the contract we are adding a party to
  /// @param _owner - owner of the contract that wae wish to delete
  function deleteContract(
    address _owner,
    uint256 _contractId
  ) public onlyOwner {
    // Find and delete the contract
    bool contractFound = false;
    for (uint256 i = 0; i < contracts[_owner].length; i++) {
      if (contracts[_owner][i].id == _contractId) {
        contractFound = true;
        // Move the last element into the place to delete
        contracts[_owner][i] = contracts[_owner][contracts[_owner].length - 1];
        // Remove the last element
        contracts[_owner].pop();
        delete contractParties[_contractId];
        delete contractServices[_contractId];
        break;
      }
    }
    require(contractFound, "Contract does not exist");
  }

  /// @notice Function that allows you to update contract's aggreement terms
  /// @param _contractId - id of the contract we are adding a party to
  /// @param _owner - owner of the contract that wae wish to delete
  /// @param _newAgreementTerms - the new agreement terms of the contract
  function updateAgreementTerms(
    address _owner,
    uint256 _contractId,
    AgreementTerms memory _newAgreementTerms
  ) public onlyOwner {
    for (uint256 i = 0; i < contracts[_owner].length; i++) {
      if (contracts[_owner][i].id == _contractId) {
        contracts[_owner][i].agreementTerms = _newAgreementTerms;
        return;
      }
    }
    revert("Contract not found");
  }

  /// @notice Function that allows you to update contract's parties
  /// @param _contractId - id of the contract we are adding a party to
  /// @param _partyIndex - index of the party we wish to update
  /// @param _newParty - the new party
  function updateParty(
    uint256 _contractId,
    uint256 _partyIndex,
    Party memory _newParty
  ) public onlyOwner {
    require(
      _partyIndex < contractParties[_contractId].length,
      "Party index out of range"
    );
    contractParties[_contractId][_partyIndex] = _newParty;
  }

  /// @notice Function that allows you to update contract's services
  /// @param _contractId - id of the contract we are adding a service to
  /// @param _serviceIndex - index of the service we wish to update
  /// @param _newService - the new service
  function updateService(
    uint256 _contractId,
    uint256 _serviceIndex,
    Service memory _newService
  ) public onlyOwner {
    require(
      _serviceIndex < contractServices[_contractId].length,
      "Service index out of range"
    );
    contractServices[_contractId][_serviceIndex] = _newService;
  }

  /// @notice Function that allows you to update the smart contract's owner
  /// @param _newOwner - new owner of the smart contract
  function transferOwnership(address _newOwner) public onlyOwner {
    require(_newOwner != address(0), "New owner is the zero address");
    emit OwnershipTransferred(deployer, _newOwner);
    deployer = _newOwner;
  }

  // ============= GETTER FUNCTIONS ============

  /// @notice Function that allows you to get the contract with a specific owner and id
  /// @param _owner - owner of the contract
  /// @param _id - id of the contract
  function getContract(
    address _owner,
    uint256 _id
  )
    public
    view
    returns (
      Contract memory contractDetails,
      Party[] memory parties,
      Service[] memory services
    )
  {
    for (uint256 i = 0; i < contracts[_owner].length; i++) {
      if (contracts[_owner][i].id == _id) {
        contractDetails = contracts[_owner][i];
        parties = contractParties[_id];
        services = contractServices[_id];
        return (contractDetails, parties, services);
      }
    }
    revert("Contract not found");
  }

  /// @notice Function that allows you to get all the contracts of a specific owner
  /// @param _owner - owner of the contract
  function getContracts(
    address _owner
  ) public view returns (Contract[] memory) {
    return contracts[_owner];
  }

  /// @notice Function that allows you to get all the contract ids of a specific owner
  /// @param _owner - owner of the contract
  function getContractIds(
    address _owner
  ) public view returns (uint256[] memory) {
    uint256 length = contracts[_owner].length;
    uint256[] memory contractIds = new uint256[](length);
    for (uint256 i = 0; i < length; i++) {
      contractIds[i] = contracts[_owner][i].id;
    }
    return contractIds;
  }

  /// @notice Function that allows you to check the owner of the smart contract

  function getOwner() public view returns (address) {
    return deployer;
  }

  function getNextContractId() public view returns (uint) {
    return nextContractId;
  }

  /// @notice Function that allows you to get contractID, party names and creation date of all contracts of a specific owner
  /// @param _owner - owner of the contract
  function getContractOverviews(
    address _owner
  ) public view returns (ContractOverview[] memory) {
    uint256 length = contracts[_owner].length;
    ContractOverview[] memory contractOverviews = new ContractOverview[](
      length
    );
    for (uint256 i = 0; i < length; i++) {
      ContractOverview memory overview;
      overview.id = contracts[_owner][i].id;

      // Assuming party A is at index 0 and party B is at index 1
      if (contractParties[contracts[_owner][i].id].length > 1) {
        overview.partyAName = contractParties[contracts[_owner][i].id][0]
          .fullName;
        overview.partyBName = contractParties[contracts[_owner][i].id][1]
          .fullName;
      }
      overview.creationDate = contracts[_owner][i].creationDate;
      contractOverviews[i] = overview;
    }
    return contractOverviews;
  }
}
