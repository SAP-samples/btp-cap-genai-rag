# Test the GenAI Mail Insights Sample Application

> **Hint** - The application has been renamed to **GenAI Mail Insights** - Screenshots will be updated soon!

In this part of the tutorial, you will learn how to test the GenAI Mail Insights Sample Application.

1. In a **multitenant** context, please ensure that you subscribed to the GenAI Mail Insights Sample application as described in the previous chapters ([click here](./1-CreateSubscription.md)). 
   
   > **Hint** - Ideally, you also used the SaaS API to upload and process our sample mails as described in the previous chapter ([click here](./3-PushSampleMails.md)).

2. In your SAP BTP Cockpit, switch to your **Role Collections** menu and assign the **GenAI Mail Insights Administrator** role collection to your own user. 

   > **Hint** - In the single-tenant scenario, you will see less role-collections and the role collections will contain less scopes.  

   [<img src="./images/RC_AssignAdmin.png" width="300"/>](./images/RC_AssignAdmin.png?raw=true)

3. In a **multitenant** context, please switch to the **Instances and Subscriptions** menu and open the GenAI Mail Insights subscription. 
   
   [<img src="./images/PGExt_OpenSubs.png" width="300"/>](./images/PGExt_OpenSubs.png?raw=true)

   In a **single-tenant** scenario, you can just open the default Cloud Foundry Route or Virtual Service of your GenAI Mail Insights Application Router. 

   [<img src="./images/PGExt_OpenUrl.png" width="300"/>](./images/PGExt_OpenUrl.png?raw=true)

4. In the application, you will see the pre-processed sample e-mails. 

    [<img src="./images/TEST_AppResult.png" width="500"/>](./images/TEST_AppResult.png?raw=true)

5. You can now select one of the mails in the list and check out the different features offered by the GenAI Mail Insights Sample application.