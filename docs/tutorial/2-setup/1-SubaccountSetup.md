# Subaccount Setup

Create a new Subaccount in your SAP BTP Cockpit, which will act as SaaS Provider Subaccount. Please consider the following infos before creating a subaccount in a concrete region (as of September 2023). This mission can not be deployed to **Trial** environments, as some of the services are not available in **Trial** landscapes. 


## SAP BTP, Kyma Runtime

- **PostgreSQL** only available for **AWS** landscapes

## SAP BTP, Cloud Foundry Runtime

- **free** plan not available in eu10

## SAP HANA Cloud

- **free** plan not available in eu10

## SAP AI Core

- Only available in **AWS** landscapes

## LLM-Proxy Service

- Internal service replaced by the **LLM-Access Service** in the future


If you are targeting a setup using **Free Tier** service plans for the majority of the services, we suggest to setup the sample scenario in the AWS **us10** region.
