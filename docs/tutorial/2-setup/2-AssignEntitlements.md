# Assign Entitlements

Assign the following **"non-default"** entitlements to your Provider Subaccount. All required entitlements except for the **LLM-Access Service** offer **free** service plans or plans that come with no additional costs (e.g., broker, hdi-shared, toos, central). 

- [Assign Entitlements](#assign-entitlements)
  - [SAP BTP, Kyma Runtime](#sap-btp-kyma-runtime)
  - [SAP BTP, Cloud Foundry Runtime](#sap-btp-cloud-foundry-runtime)

> **Important** - The **generative AI hub in SAP AI Core** will result in a minor fee, based on the tokens consumed by your application. Please check the latest pricing details within the SAP Discovery Center ([click here](https://discovery-center.cloud.sap/serviceCatalog/sap-ai-core?region=all&tab=service_plan)).

> **Important** - This setup assumes, that you will create a new SAP HANA Cloud instance in the respective Provider Subaccount. If you are sharing an existing SAP HANA Cloud instance, please skip the **SAP HANA Cloud** entitlements and only assign the **hdi-shared** service plan.


## SAP BTP, Kyma Runtime

| Service / Subscription                                                                                                                                               | Plan                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| [SAP AI Core](https://discovery-center.cloud.sap/serviceCatalog/sap-ai-core?region=all)                                                                              | sap-internal (paid)  |
| [SAP Authorization and Trust Management Service](https://discovery-center.cloud.sap/serviceCatalog/authorization-and-trust-management-service?region=all)            | broker               |
| [SAP BTP, Kyma Runtime](https://discovery-center.cloud.sap/serviceCatalog/kyma-runtime?region=all)                                                                   | free                 |
| [SAP Cloud Management Service for SAP BTP](https://discovery-center.cloud.sap/serviceCatalog/cloud-management-service?region=all)                                    | central              |
| [SAP HANA Cloud](https://discovery-center.cloud.sap/serviceCatalog/sap-hana-cloud?region=all) <br> (Optional if shared instance is being used)                       | hana-free <br> tools |
| [SAP HANA Schemas & HDI Containers](https://help.sap.com/docs/SAP_HANA_PLATFORM/3823b0f33420468ba5f1cf7f59bd6bd9/e28abca91a004683845805efc2bf967c.html?locale=en-US) | hdi-shared           |
| [PostgreSQL on SAP BTP, hyperscaler option](https://discovery-center.cloud.sap/serviceCatalog/postgresql-hyperscaler-option?region=all)                              | free                 |

> **Hint** - If you cannot assign the **free** PostgreSQL service plan (e.g., SAP-managed accounts), consider a **paid** plan (incl. storage plan). Make sure to check the pricing first, as the costs will be charged against your SAP BTP Global Account. 

## SAP BTP, Cloud Foundry Runtime

| Service / Subscription                                                                                                                                               | Plan                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| [SAP AI Core](https://discovery-center.cloud.sap/serviceCatalog/sap-ai-core?region=all)                                                                              | sap-internal (paid)  |
| [SAP Authorization and Trust Management Service](https://discovery-center.cloud.sap/serviceCatalog/authorization-and-trust-management-service?region=all)            | broker               |
| [SAP BTP, Cloud Foundry Runtime](https://discovery-center.cloud.sap/serviceCatalog/cloud-foundry-runtime?region=all)                                                 | free                 |
| [SAP Cloud Management Service for SAP BTP](https://discovery-center.cloud.sap/serviceCatalog/cloud-management-service?region=all)                                    | central              |
| [SAP Credential Store](https://discovery-center.cloud.sap/serviceCatalog/credential-store?region=all)                                                                | free                 |
| [SAP HANA Cloud](https://discovery-center.cloud.sap/serviceCatalog/sap-hana-cloud?region=all) <br> (Optional if shared instance is being used)                       | hana-free <br> tools |
| [SAP HANA Schemas & HDI Containers](https://help.sap.com/docs/SAP_HANA_PLATFORM/3823b0f33420468ba5f1cf7f59bd6bd9/e28abca91a004683845805efc2bf967c.html?locale=en-US) | hdi-shared           |
| [PostgreSQL on SAP BTP, hyperscaler option](https://discovery-center.cloud.sap/serviceCatalog/postgresql-hyperscaler-option?region=all)                              | free                 |

> **Hint** - If you cannot assign the **free** PostgreSQL service plan (e.g., SAP-managed accounts), consider a **paid** plan (incl. storage plan). Make sure to check the pricing first, as the costs will be charged against your SAP BTP Global Account. 