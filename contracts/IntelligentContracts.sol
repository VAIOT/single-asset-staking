// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract IntelligentContracts {
    struct ContractInfo {
        string date;
        string supplierName;
        string supplierStreetName;
        string supplierStreetNumber;
        string supplierPostalCode;
        string supplierCity;
        string supplierCountry;
        string buyerName;
        string buyerStreetName;
        string buyerStreetNumber;
        string buyerPostalCode;
        string buyerCity;
        string buyerCountry;
        string serviceDescription;
        uint amount;
        string country;
    }

    function storeInfo() public {}
}
