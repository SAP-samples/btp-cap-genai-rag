# Cloud Foundry Deployment

## Create Service Keys
cf csk dev-aisaas-uaa dev-aisaas-uaa-key
cf csk dev-aisaas-api-uaa dev-aisaas-api-uaa-key
cf csk dev-aisaas-destination dev-aisaas-destination-key
cf csk dev-aisaas-registry dev-aisaas-registry-key
cf csk dev-aisaas-service-manager dev-aisaas-service-manager-key 
cf csk dev-aisaas-com-hdi-container dev-aisaas-com-hdi-container-key
cf csk dev-aisaas-service-manager-admin dev-aisaas-service-manager-admin-key

## Create Bindings
cds bind -2 dev-aisaas-destination,dev-aisaas-uaa --for development --output-file srv/.cdsrc-private.json
cds bind -2 dev-aisaas-destination,dev-aisaas-uaa --for local-with-mtx --output-file srv/.cdsrc-private.json

cds bind -2 dev-aisaas-destination,dev-aisaas-uaa --for hybrid --output-file srv/.cdsrc-private.json
cds bind hana -2 dev-aisaas-com-hdi-container --kind hana --for hybrid --output-file srv/.cdsrc-private.json
cds bind saas-registry -2 dev-aisaas-registry --kind saas-registry --for hybrid --output-file srv/.cdsrc-private.json
cds bind sm-container -2 dev-aisaas-service-manager --kind service-manager --for hybrid --output-file srv/.cdsrc-private.json
cds bind sm-admin -2 dev-aisaas-service-manager-admin --kind service-manager --for hybrid --output-file srv/.cdsrc-private.json

## Setup PostgreSQL tunnel

cf enable-ssh aisaas-srv-dev
cf create-service-key dev-aisaas-postgresql-db dev-aisaas-postgresql-db-key
cf service-keys dev-aisaas-postgresql-db dev-aisaas-postgresql-db-key
cf ssh -L 63306:hostname:port aisaas-srv-dev

Copy **credentials** from service key into code/srv/.cdsrc-private.json. Update the "hostname" and the "port" as depicted below.

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