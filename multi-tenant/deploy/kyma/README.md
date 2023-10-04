# Kyma Deployment

# Local Development

cds bind -2 aisaas-srv-destination,aisaas-srv-xsuaa --on k8s --for hybrid --output-file srv/.cdsrc-private.json
cds bind hana -2 aisaas-srv-hana --kind hana --on k8s --for hybrid --output-file srv/.cdsrc-private.json
cds bind saas-registry -2 aisaas-srv-saas-registry --kind saas-registry --on k8s --for hybrid --output-file srv/.cdsrc-private.json
cds bind sm-admin -2 aisaas-srv-sm-admin --kind service-manager --on k8s --for hybrid --output-file srv/.cdsrc-private.json
cds bind sm-container -2 aisaas-srv-sm-container --kind service-manager --on k8s --for hybrid --output-file srv/.cdsrc-private.json
cds bind postgresql-db -2 aisaas-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid --output-file srv/.cdsrc-private.json

cds bind -2 aisaas-srv-destination,aisaas-srv-xsuaa --on k8s --for development --output-file srv/.cdsrc-private.json
cds bind -2 aisaas-srv-destination,aisaas-srv-xsuaa --on k8s --for local-with-mtx --output-file srv/.cdsrc-private.json