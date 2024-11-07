# Test the GenAI Mail Insights Sample Application

In this part of the tutorial, you will learn how to test the GenAI Mail Insights Sample Application.

1. In your SAP BTP Cockpit, switch to your **Role Collections** menu and assign the **GenAI Mail Insights Administrator** or **Member** role collection to your own user.

   [<img src="./images/TEST_STRCs.png" width="300"/>](./images/TEST_STRCs.png?raw=true)

2. In a **single-tenant** scenario, you can just open the default Cloud Foundry Route or API Rule of your GenAI Mail Insights Application Router.

   > **Hint** - Ideally, you also used the **addMails** endpoint of your CAP service to upload and process our sample mails as described in the previous chapter ([click here](./3-PushSampleMails.md)). Otherwise you will not see any processed mails and need to add them manually using the respective button.

   [<img src="./images/PGExt_OpenUrl.png" width="300"/>](./images/PGExt_OpenUrl.png?raw=true)

3. In the application, you will see the pre-processed sample e-mails.

   [<img src="./images/TEST_AppResult.png" width="300"/>](./images/TEST_AppResult.png?raw=true)

4. You can now select one of the mails in the list and check out the different features offered by the GenAI Mail Insights Sample application.
