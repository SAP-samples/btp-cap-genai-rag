# Hybrid Development

In this chapter, you will learn how to set up a hybrid testing environment. Hybrid in this case means, consuming all backing services from SAP BTP, while your application logic is executed on your local development environment. This allows you to conduct more realistic debugging scenarios.

While the chapter appears to be quite comprehensive, please consider this is a one-time action, which does not need to be repeated once configured. Before starting, please ensure that you deployed the GenAI Mail Insights application within Subaccount. For starting the hybrid development, you must have deployed the GenAI Mail Insights application in your Cloud Foundry Environment using **cf deploy** as described in the previous tutorial steps.

1. Rrun the following commands, to create the essential Service Keys in Cloud Foundry and the respective **.cdsrc-private.json** files required for hybrid testing.

   **Binding Service Instances**

   ```sh
   cds bind -2 <Space>-ai-hdi-container,<Space>-genai-mail-insights-uaa,<Space>-generative-ai-hub
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

2. After the **.cdsrc-private.json** has been created, you can run the application in hybrid mode, by executing the below commands:

   ```sh
   # Run in ./single-tenant/code #

   npm run watch

   # Single starts also possible
   npm run app # App Service
   npm run ui5 # SAPUI5 App
   npm run router # SAP Approuter
   ```

3. You can now open the application using the URL of the SAP Approuter: `http://localhost:5000`
