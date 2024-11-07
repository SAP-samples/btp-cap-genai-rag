# Deploy the Application

In the following steps, you will deploy the built multi-target application to your SAP BTP, Cloud Foundry Runtime:

1. Once your Multi-Target Application Archive is built, please ensure you are logged in to your target Cloud Foundry Space by running the following command. (Re-)Login if required.

   > **Hint** - In this tutorial we assume a basic understanding of the Cloud Foundry deployment process. Please make sure you successfully installed the **Cloud Foundry CLI** in your development environment before you continue.

   ```sh
   # Check target Org and Space #
   cf target

   # (Re-)Login if required #
   cf login -a "https://api.cf.<Region>.hana.ondemand.com"
   ```

2. Make sure you have the MultiApps CF CLI Plugin installed.

> **Hint** - You can find further details on the following website [https://github.com/cloudfoundry/multiapps-cli-plugin](https://github.com/cloudfoundry/multiapps-cli-plugin).

```
cf install-plugin multiapps
```

3. Start the deployment to Cloud Foundry, by running the following command.

   ```sh
   # Run in ./single-tenant/deploy/cf #
   npm run deploy
   ```

4. The deployment process will take a while. Wait for the process to finish successfully and also check in the **SAP BTP Cockpit** if all service instances have been created successfully.

   [<img src="./images/DEP_CfSuccess.png" width="400"/>](./images/DEP_CfSuccess.png?raw=true)
