#  Define LLM-Proxy Service Destination

Using the **LLM-Proxy Service**, you will receive credentials by SAP, which can be used in a SAP BTP Destination of your Provider Subaccount and allow a connection from your multitenant SaaS application to the SAP-managed SAP AI Core instance offering the LLM-Access service. 

Please create a new Subaccount-level destination in your Provider Subaccount as follows.

```md
Name=PROVIDER_AI_CORE_DESTINATION
Type=HTTP
ProxyType=Internet
Authentication=OAuth2ClientCredentials
tokenServiceURLType=Dedicated
clientId=<uaa.clientid>
clientSecret=<uaa.clientsecret>
tokenServiceURL=<uaa.url>/oauth/token
URL=<url>
```

Take the respective placeholders from the Service Credentials provided by SAP. 

> **Hint** - Do not be concerned if you receive a 401 error when testing the destination.

