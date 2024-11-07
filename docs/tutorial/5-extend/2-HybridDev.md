# Hybrid Development

In this chapter, you will learn how to set up a hybrid testing environment. Hybrid in this case means, consuming all backing services from SAP BTP, while your application logic is executed on your local development environment. This allows you to conduct more realistic debugging scenarios.

While the chapter appears to be quite comprehensive, please consider this is a one-time action, which does not need to be repeated once configured. Before starting, please ensure that you deployed the GenAI Mail Insights application within Subaccount.

## SAP BTP, Cloud Foundry Runtime

1. For starting the hybrid development, you must have installed the GenAI Mail Insights application in your Cloud Foundry Environment using **cf deploy** as described in the previous tutorial steps.

2. Once the application is installed and all Service Instances are created please run the following commands, to create the essential Service Keys in Cloud Foundry and the respective **.cdsrc-private.json** files required for hybrid testing. In contrast to Kyma, we are not using the existing Service Bindings but need to create dedicated Service Keys for the hybrid testing setup.

   > **Hint** - If you already executed the local development chapter, some of the service keys might already exist. Just ignore the respective system message.

   **Service Keys**

   ```sh
   # Single-Tenant
   cf csk <Space>-ai-uaa <Space>-ai-uaa-key
   cf csk <Space>-ai-destination <Space>-ai-destination-key
   cf csk <Space>-ai-hdi-container <Space>-ai-hdi-container-key
   ```

   **App Service**

   ```sh
   # Run in ./single-tenant/code #

   # Single-Tenant
   cds bind -2 <Space>-ai-destination,<Space>-ai-uaa,<Space>-ai-hdi-container --for hybrid
   ```

   **Application Router**

   Duplicate the file `default-services.sample.json` in `./single-tenant/code/router/dev/` and rename it to `default-services.json`. Enter the respective credentials of your UAA service (`<Space>-ai-uaa` or `<Space>-aisaas-uaa` depending on the setup).

   ```sh
   # default-services.json
   {
      "uaa": {
         "url": "<YOUR-AUTH-URL>", # e.g., https://scewdfcf2.authentication.eu12.hana.ondemand.com
         "clientid": "<YOUR-CLIENTID>",
         "clientsecret": "<YOUR-SECRET>"
      }
   }
   ```

   **HTML5 Deployer**

   ```sh
   # Run in ./single-tenant/code #

   # Single-Tenant
   cf csk <Space>-ai-html5-repo-host <Space>-ai-html5-repo-host-key
   cds bind html5-apps-repo -2 <Space>-ai-html5-repo-host --kind html5-apps-repo --for hybrid-html5
   ```

3. After configuring your **.cdsrc-private.json** files, you can run the application in hybrid mode, by executing the below commands.

   ```sh
   # Run in ./single-tenant/code #

   npm run watch

   # Single starts also possible
   npm run app # App Service
   npm run ui5 # SAPUI5 App
   npm run router # SAP Approuter
   ```

4. You can now open the application using the URL of the SAP Approuter: `http://localhost:5000`
