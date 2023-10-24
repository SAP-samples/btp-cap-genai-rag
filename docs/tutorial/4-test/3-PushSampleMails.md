# Push sample mails

In this chapter you will learn, how SaaS Subscribers can push sample mails to their SaaS instance using the SaaS API. 

1. Find the provided **http** sample file **requests-btp.http** ([click here](../../../code/test/http/requests-btp.http)), containing a few test mails for processing. 
   
2. Cope and rename the file to **requests-btp-private.http** to ensure that your credentials are not accidentally being committed to GitHub. 

    [<img src="./images/TEST_PrivateFile.png" width="300"/>](./images/TEST_PrivateFile.png?raw=true)

3. Update the variables in the very beginning of the **http** test file. In a multitenant scenario, you can find the required values in the **Service Binding** which you created in the previous step of this section. 
   
   > **Important** - In a single tenant setup, you can just use an existing Service Binding or new Service Key of your **xsuaa** instance and use the default **Cloud Foundry Route** or **Virtual Service** created for your CAP Application as *btpAppHostname* value. 

    ```md
    @xsuaaHostname = <uaa.url>
    @btpXsuaaClient = <uaa.clientid>
    @btpXsuaaSecret = <uaa.clientsecret>
    @btpAppHostname = <apiUrl>
    ```

4. Execute the **GET XSUAA TOKEN** request by clicking on **Send Request**.

    ```http
    ### GET XSUAA TOKEN

    # @name getXsuaaToken
    POST {{xsuaaHostname}}/oauth/token
    Accept: application/json
    Content-Type: application/x-www-form-urlencoded
    Authorization: Basic {{btpXsuaaClient}}:{{btpXsuaaSecret}}

    client_id={{btpXsuaaClient}}
    &client_secret={{btpXsuaaSecret}}
    &grant_type=client_credentials
    ```

5. Once you successfully retrieved a token issued by XSUAA, please scroll down and execute the **ADD MAILS** request. The request will automatically inject the token retrieved from XSUAA. 
   
   > **Important** - For single-tenant scenarios, please use the **odata/v4/mail-insights** path instead of the **rest/api/mail-insights** path as indicated below. 

    ```http
    ### ADD MAILS
    @token = {{getXsuaaToken.response.body.$.access_token}}

    # @name addMails
    POST {{btpAppHostname}}/rest/api/mail-insights/addMails
    content-type: application/json
    Authorization: Bearer {{token}}

    {
        "mails":[
            {
                "subject": "Disney World trip",
                "body": "Hello. I'm trying to book ...Lisa Brown",
                "sender": "lisa.brown@example.org"
            },
        ...
    ```

6. Once the sample e-mails have been processes successfully, you should see them within your SaaS application. Furthermore, check the chapter on **Extending** the solution to learn how to check the processed e-mails within your PostgreSQL database. 

