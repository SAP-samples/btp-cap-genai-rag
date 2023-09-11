# Hybrid Development

In this chapter, you will learn how to set up a hybrid testing environment. Hybrid in this case means, consuming all backing services from SAP BTP, while your application logic is executed on your local development environment. This allows you to conduct more realistic debugging scenarios. 

## Kyma

**App Service**

```sh
cds bind -2 <ReleaseName>-srv-destination,<ReleaseName>-srv-xsuaa --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
cds bind hana -2 <ReleaseName>-srv-hana --kind hana --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
cds bind saas-registry -2 <ReleaseName>-srv-saas-registry --kind saas-registry --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
cds bind sm-admin -2 <ReleaseName>-srv-sm-admin --kind service-manager --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
cds bind sm-container -2 <ReleaseName>-srv-sm-container --kind service-manager --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
cds bind postgresql-db -2 <ReleaseName>-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid --output-file app-service/.cdsrc-private.json
```

**API Service**

```sh
cds bind -2 <ReleaseName>-api-srv-destination,<ReleaseName>-api-srv-xsuaa --on k8s --for hybrid --output-file api-service/.cdsrc-private.json
cds bind sm-container -2 <ReleaseName>-api-srv-sm-container --kind service-manager --on k8s --for hybrid --output-file api-service/.cdsrc-private.json
cds bind postgresql-db -2 <ReleaseName>-api-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid --output-file api-service/.cdsrc-private.json
```

## Cloud Foundry

**App Service**

```sh
cf csk <Space>-aisaas-registry <Space>-aisaas-registry-key
cf csk <Space>-aisaas-service-manager <Space>-aisaas-service-manager-key 
cf csk <Space>-aisaas-com-hdi-container <Space>-aisaas-com-hdi-container-key
cf csk <Space>-aisaas-service-manager-admin <Space>-aisaas-service-manager-admin-key
cf csk <Space>-aisaas-postgresql-db <Space>-aisaas-postgresql-db-key
```

**App Service**

```
cds bind -2 <Space>-aisaas-destination,<Space>-aisaas-uaa --for hybrid --output-file app-service/.cdsrc-private.json
cds bind hana -2 <Space>-aisaas-com-hdi-container --kind hana --for hybrid --output-file app-service/.cdsrc-private.json
cds bind saas-registry -2 <Space>-aisaas-registry --kind saas-registry --for hybrid --output-file app-service/.cdsrc-private.json
cds bind sm-container -2 <Space>-aisaas-service-manager --kind service-manager --for hybrid --output-file app-service/.cdsrc-private.json
cds bind sm-admin -2 <Space>-aisaas-service-manager-admin --kind service-manager --for hybrid --output-file v/.cdsrc-private.json
cds bind postgresql-db -2 <Space>-aisaas-postgresql-db --kind postgresql-db --for hybrid --output-file app-service/.cdsrc-private.json
```

**API Service**

```
cds bind -2 <Space>-aisaas-api-destination,<Space>-aisaas-api-uaa --for hybrid --output-file api-service/.cdsrc-private.json
```

**Start SSH Tunnel**

cf enable-ssh aisaas-srv-<Space>
cf create-service-key <Space>-aisaas-postgresql-db <Space>-aisaas-postgresql-db-key
cf service-keys <Space>-aisaas-postgresql-db <Space>-aisaas-postgresql-db-key
cf ssh -L 63306:<hostname>:<port> aisaas-srv-<Space>


**Update hybrid profile**

```json
"postgres": {
    "credentials": {
        "port": "63306", // Update to 63306
        "hostname": "127.0.0.1", // Update to 127.0.0.1
        "dbname": "...",
        "password": "...",
        "sslcert": "...",
        "sslrootcert": "...",
        "uri": "...",
        "username": "...",
    }
}