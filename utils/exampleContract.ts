export const agreementTerms = {
  duration: "1 year",
  finalDate: "2024-01-01",
  earlyTerminationPossible: "No",
  terminationPeriod: "1 month",
  supplierReimbursement: "None",
  intellectualPropertyOwner: "Supplier",
  currency: "USD",
  fixedAmount: "5000",
  includeTax: "Yes",
  typeOfCompensation: "Fixed",
  courtJurisdiction: "Poland",
};

export const parties = [
  {
    partyType: "Supplier",
    entityType: "Individual",
    fullName: "Alice",
    streetName: "Main Street",
    streetNumber: "123",
    postalCode: "12345",
    city: "San Francisco",
    country: "USA",
    signatoryName: "Alice",
  },
  {
    partyType: "Client",
    entityType: "Company",
    fullName: "Bob's Company",
    streetName: "Second Street",
    streetNumber: "456",
    postalCode: "54321",
    city: "New York",
    country: "USA",
    signatoryName: "Bob",
  },
];

export const services = [
  {
    service: "Web Development",
    kpi: ["Deliver MVP", "Monthly updates"],
  },
];
