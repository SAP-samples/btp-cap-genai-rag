# Frequently Asked Questions

## Repository Structure

1. Why are there two different CAP Projects (app-service and api-service)?
   
As the App Service and the API Service require different **xsuaa** bindings, two separate CAP services are required. One CAP service can only bind a single xsuaa instance. As our API requires a xsuaa instance of type/plan **broker**, our SaaS App requires a xsuaa instance of type/plan **application**. 


2. Why can't we use the same xsuaa service instance for both CAP projects?

Providing SaaS subscribers access to the Client Credentials of the xsuaa instance based on the **application** service plan, allows them to generate access tokens for each and every SaaS subscriber. It is essential to keep credentials of this service instance confidential and to never share them with any SaaS subscriber.

For programmatic access via our SaaS API, a xsuaa instance based on the **broker** service plan is required. Client Credentials issued by this service instance will be issued for the dedicated SaaS subscriber only and cannot be used to issue tokens impersonating another SaaS subscriber. 


3. Why are there multiple .cdsrc.json and .cdsrc-private.json files?

The .cdsrc.json and .cdsrc-private.json files in the *app-service* and *api-service* directory only serve the local and hybrid testing purpose. As explained, two different xsuaa instances are required for the CAP-based API and App service. Therefore, also different binding configurations in the .cdscr-private.json are required. 

**app-service/.cdsrc-private.json**

```json
"auth": {
    "binding": {
        "org": "sap-demo",
        "space": "dev",
        "instance": "dev-aisaas-uaa",
        "key": "dev-aisaas-uaa-key"
    },
    "kind": "xsuaa"
},
```

**api-service/.cdsrc-private.json**

```json
"auth": {
    "binding": {
        "org": "sap-demo",
        "space": "dev",
        "instance": "dev-aisaas-api-uaa",
        "key": "dev-aisaas-api-uaa-key"
    },
    "kind": "xsuaa"
}
```

As you can see, for local development and hybrid testing, both CAP service bind different xsuaa service instances. Furthermore, the API service requires less bindings, as e.g., no **hana** binding for setting up the cross-container-access or no **subaccount-admin** Service Manager instance is required. Furthermore, when using the CAP **Extensibility** feature, this cannot be used for the API Service and the App Service in parallel, therefore, it has to be switched off for the API Service. 


4. What's the purpose of the *.cdsrc.json* file in the **srv** folders? 

Our CAP projects contain a *.cdsrc.json* file in the respective srv folders. This *.cdsrc.json* file contains the **production** profile configuration of our CAP Services. We decided not to mix this profile with the **hybrid** or **development** profiles, which are defined in separate *.cdsrc.json* files one level up. While this 


