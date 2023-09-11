# Local Development

In this chapter, you will learn how to set up a local environment. Local in this case means your application logic is executed on your local development environment, while only the LLM is consumed through a SAP BTP Destination. This allows you to conduct more realistic debugging scenarios. 


## Kyma

Even though we are in a local development setup, the Large-Language-Model itself is hard to mock, though we will still need access to our destination pointing to the LLM Proxy Service. Same applies to the XSUAA instance, required to issue a token for accessing the destinations. 

1. For starting the local development, you will at least need a Destination Service instance, as well as an XSUAA instance in your SAP BTP Kyma cluster. Therefore, we suggest to install the AI SaaS application at least once, using **helm install**. 

2. Once the application is installed and all Service Instances are created please run the following commands, to create the respective **.cdsrc-private.json** files required for local testing. 

**App Service**

```sh
cds bind -2 <ReleaseName>-srv-destination,<ReleaseName>-srv-xsuaa --on k8s --for development --output-file app-service/.cdsrc-private.json
```

**API Service**

```sh
cds bind -2 <ReleaseName>-api-srv-destination,<ReleaseName>-api-srv-xsuaa --on k8s --for development --output-file api-service/.cdsrc-private.json
```

## Cloud Foundry

**App Service**

```sh
cf csk <Space>-aisaas-uaa <Space>-aisaas-uaa-key
cf csk <Space>-aisaas-destination <Space>-aisaas-destination-key
```

```sh
cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-uaa --for development --output-file app-service/.cdsrc-private.json
cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-uaa --for local-with-mtx --output-file app-service/.cdsrc-private.json
```

**API Service**

```sh
cf csk <Space>-aisaas-api-uaa <Space>-aisaas-api-uaa-key
cf csk <Space>-aisaas-destination <Space>-aisaas-api-destination-key
```

```sh
cds bind -2 <Space>-aisaas-api-destination,<Space>-aisaas-api-uaa --for development --output-file api-service/.cdsrc-private.json
cds bind -2 <Space>-aisaas-api-destination,<Space>-aisaas-api-uaa --for local-with-mtx --output-file api-service/.cdsrc-private.json
```