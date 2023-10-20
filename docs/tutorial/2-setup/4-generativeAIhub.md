#  Setup the generative AI hub in SAP AI Core

The generative AI hub which is part of the SAP AI Core offering, allows you to connect your application to Large Language Models such as GTP 3.5 and GTP 4, as well as respective embedding models. In this chapter you will learn how to setup the respective SAP AI Core component in your SAP BTP Global Account. 

## Create Service Instance

1. In you entitlements, please add the following services and respective service plans to your subaccount.

  - **SAP AI Launchpad** - free (Application)
  - **SAP AI Core** - sap-internal 

2. In your subaccount, please create a new service instance for the SAP AI Core entitlement. 

>**Hint** - In our scenario we are using the **Other** environment type, as we are consuming the SAP AI Core APIs via a dedicated destination. Alternatively, you can also use the **Cloud Foundry** or **Kyma** environment and **bind** the service instance. 


3. 