# Post-Deployment Actions

This chapter is not relevant for **Kyma** deployments and can be skipped.  If your application is deployed to the **Cloud Foundry** runtime, please ensure to follow along the Post-Deployment step, allowing a seamless automation of the Subscription process (e.g., setup of Cloud Foundry Routes).

## SAP BTP, Cloud Foundry Runtime

1. In your Provider Subaccount, please go to the **Instances and Subscriptions** menu and click on your **\<Space>-aisaas-credstore** instance or use the **Manage Instance** button. 

    [<img src="./images/CS_Service.png" width="400"/>](./images/CS_Service.png?raw=true)

2. In the instance management, please switch to the **Credential Store** menu and click on **Create Namespace**. 

    [<img src="./images/CS_Namespace.png" width="400"/>](./images/CS_Namespace.png?raw=true)

3. A namespace needs to be created together with the first credential value. Therefore, please select the Credential Type **Password** and click on **Next**.   

    [<img src="./images/CS_InitialValue.png" width="400"/>](./images/CS_InitialValue.png?raw=true)

4. In the following screen, define the namespace called **aisaas** and provide the following credential value details.  

    **Name**: btp-admin-user

    **Value & Username**: Provide the e-mail address (Username) and password (Value) of a SAP BTP user which is used for automation purposes. Make sure this user has the **Subaccount Administrator** role-collection in your **Provider subaccount** and the **Space Developer** role in the respective Cloud Foundry Space.

    > **Hint** - If you don't want to use a personal/named user for this purpose, we recommend using a custom IdP and defining a technical user there. The usage of **P or S-User** for technical tasks is possible but for productive scenarios not recommended. 

    [<img src="./images/CS_AdminUser.png" width="200"/>](./images/CS_AdminUser.png?raw=true)

5. Please create a second **Password** credential value as described below.
 
    **Name**: aisaas-broker-credentials

    **Value & Username**: As Value please provide the **Plaintext Password** of your API broker user. This password is required when registering the API broker in any of your consumer subaccounts during automation.

    > **Hint** - You created this password in step 5 of [Build the components](./1-BuildTheComponents.md#cloud-foundry) . <br>
    [<img src="./images/SB_PlainText.png" width="500"/>](./images/SB_PlainText.png?raw=true)

    As a Username please use the value **broker-user**. 

    [<img src="./images/CS_BrokerUser.png" width="200"/>](./images/CS_BrokerUser.png?raw=true)

6. This is it, you successfully configured the Credential Store values as part of the **Post-Deployment Actions**. You can now continue testing the Application. 