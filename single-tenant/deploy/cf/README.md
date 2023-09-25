# Cloud Foundry Local and Hybrid Testing

Run the following commands in /single-tenant/code after first successful deployment. 

## Create Service Keys
cf csk dev-ai-uaa dev-ai-uaa-key
cf csk dev-ai-destination dev-ai-destination-key
cf csk dev-ai-hdi-container dev-ai-hdi-container-key
cf csk dev-ai-html5-repo-runtime dev-ai-html5-repo-runtime-key 

## Create Bindings
cds bind -2 dev-ai-destination --for development
cds bind auth -2 dev-ai-uaa --kind basic --for development

cds bind -2 dev-ai-destination,dev-ai-uaa --for hybrid
cds bind db -2 dev-ai-hdi-container --kind hana --for hybrid
cds bind html5-apps-repo -2 dev-ai-html5-repo-runtime --kind html5-apps-repo --for hybrid

## Setup PostgreSQL tunnel
cf enable-ssh ai-srv-dev
cf restart ai-srv-dev
cf create-service-key dev-ai-postgresql-db dev-ai-postgresql-db-key
cf service-keys dev-ai-postgresql-db dev-ai-postgresql-db-key
cf ssh -L 63306:hostname:port ai-srv-dev

Copy **credentials** from service key into the **hybrid** profile of your /multi-tenant/code/app-service/.cdsrc-private.json. Update the "hostname" and the "port" as depicted below.
Repeat the process for /multi-tenant/code/api-service/.cdsrc-private.json. Update the "hostname" and the "port" as depicted below.

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
```