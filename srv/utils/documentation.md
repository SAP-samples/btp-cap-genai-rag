# Susaas General Utils Documentation

## Contents

- [Description](#description)
- [Overview](#Overview)
  - [Automator](#Automator)
  - [Cloud-Management-Helper](#Cloud-Management-Helper)
  - [Service-Manager-Helper](#Service-Manager-Helper)
  - [Token-Helper](#Token-Helper)
  - [Destination-Helper](#Destination-Helper)
  - [Credential-Store-Helper](#Credential-Store-Helper)
  - [User-Management-Helper](#User-Management-Helper)

## Description

Documentation of helper libraries used on development of the Sustainable SaaS Application 

## Overview

Table below shows all the helper classes used during development of the Sustainable SaaS Application

| Util          | Source Code                | Description                                                           | 
| ------------- | -------------------------- | --------------------------------------------------------------------- |
| [Automator](#Automator)     | [automator.js](./automator.js)| Helper class for automatic creation and deletion artifacts on tenant on-offborarding | 
| [Cloud-Management-Helper](#Cloud-Management-Helper) | [cis-central.js](./cis-central.js) | Helper class for interacting Cloud Management Service Central Plan |
| [Service-Manager-Helper](#Service-Manager-Helper) | [service-manager.js](./service-manager.js) | Helper class for interacting Service Manager Subaccount admin plan |
| [Token-Helper](#Token-Helper)  | [token-utils.js](./token-utils.js) | Helper class for retrieving token from relevant oAuth2 servers |
| [Destination-Helper](#Destination-Helper)  | [destination.js](./destination.js) | Helper module for interacting destination service  |
| [Credential-Store-Helper](#Credential-Store-Helper)  | [credStore.js](./credStore.js) | Helper module for interacting Credential Store service |
| [User-Management-Helper](#User-Management-Helper)  | [user-management.js](./user-management.js) | Helper class for User and role management interacting with Identity Authentication Service and XSUAA Service |


### Automator

For effortless tenant on-offboarding in the SaaS context, it is essential to automate
the process of onboarding as much as it can be automated.

This automator helps to provide fully automated, self-service on-offboarding experience.

Automator is responsible of following topics:
- Creation of destination service at tenant subaccount on subscription with the help of [destination.js](./destination.js)
- Deletion of destination service from tenant subaccount on unsubscription with the help of [destination.js](./destination.js)
- Creation of service manager service instance & binding at tenant subaccount with the help of [cis-central.js](./cis-central.js)
- Deletion of service manager service instance & binding from tenant subaccount with the help of [cis-central.js](./cis-central.js)
- Registering service broker from tenant subaccount on subscription with the help of [service-manager.js](./service-manager.js)
- Unregistering service broker from tenant subaccount on unsubscription with the help of [service-manager.js](./service-manager.js)


When a tenant subscribed to the Sustainable SaaS App from SAP BTP,
1. A new Service Manager instance will be created in tenant subaccount by Cloud Management Service - Central Plan
2. Susaas Inbound API Broker will be registered by the Service Manager instance created at Step 1.
3. Destination **susaas-api** will be created.
4. Service Manager instance created at Step 1 will be deleted.

When a tenant unsubscribed from the Sustainable SaaS App from SAP BTP
1. A new Service Manager instance will be created in tenant subaccount by Cloud Management Service - Central Plan
2. Susaas Inbound API Broker will be unregistered by the Service Manager instance created at Step 1.
3. Destination **susaas-api** will be deleted.
4. Service Manager instance created at Step 1 will be deleted.


### Cloud-Management-Helper
[SAP BTP Cloud Management Service](#https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/17b6a171552544a6804f12ea83112a3f.html?locale=en-US&q=Cloud%20Management%20Central) enables SAP BTP Admins to handle administrative tasks via API's.

In this Sustainable SaaS application context, we are using **SAP BTP Cloud Management Service** to create and delete Service Manager
instances on tenant subaccounts.

### Service-Manager-Helper

Service Manager is a central registry for service brokers and platforms. It tracks service instances creation and allows sharing of services and service instances between different Platform Instances. The Service Manager allows for an application to use services and service instances from multiple platforms.

Service Manager Helper is used for registering and unregistering Susaas Inbound API Broker in Sustainable SaaS App Context
with interacting [Service Manager service instance](https://api.sap.com/api/APIServiceManagment/overview).

### Token-Helper
[Token helper module](./token-utils.js) is used for retrieving tokens from oAuth2 servers via password and client credentials type.



### Credential-Store-Helper
[Credential store helper module](./credStore.js) is used to interact with [credential store service](https://api.sap.com/package/CredentialStore/rest)
on provider subaccount.

### User-Management-Helper
[User Management Helper Class](./user-management.js) is used for handling user management on both IAS and SAP BTP.
For this use case, it is required to provide to the tenants in-app user management.

**Requirements**: 
1. Tenant Admin should be able to create user without going into SAP BTP Subaccount.
2. Tenant Admin should be able to assign role collections to the user without going into SAP BTP Subaccount.
3. Tenant Admin should be able to delete user without going into SAP BTP Subaccount.

**How does the creation of user work?**
1. User is created on [SAP IAS](https://help.sap.com/docs/IDENTITY_AUTHENTICATION/6d6d63354d1242d185ab4830fc04feb1/d17a116432d24470930ebea41977a888.html?version=Cloud&locale=en-US).
2. A shadow user is created at SAP BTP on tenant subaccount.
3. Given role has been assigned to the Shadow User for authorization purposes.

**How does the deletion of user work?**
1. User is deleted from tenant subaccount
2. User is deleted from SAP IAS.

To be able to provide this functionality User-Management-Helper interacts with SAP IAS APIs and SAP BTP XSUAA APIs together.


### Destination-Helper
[Destination Helper Module](./user-management.js) is used for getting creating and deleting destinations in any given subaccount.


