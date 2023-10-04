# Kyma Deployment

Run the following commands in /single-tenant/code after first successful deployment. 

## Create Bindings
cds bind -2 ai-srv-destination --for development --on k8s
cds bind auth -2 ai-srv-xsuaa --kind basic --for development --on k8s

cds bind -2 ai-srv-destination,ai-srv-xsuaa --on k8s --for hybrid 
cds bind hana -2 ai-srv-hana --kind hana --on k8s --for hybrid 
cds bind saas-registry -2 ai-srv-saas-registry --kind saas-registry --on k8s --for hybrid 
cds bind sm-admin -2 ai-srv-sm-admin --kind service-manager --on k8s --for hybrid 
cds bind sm-container -2 ai-srv-sm-container --kind service-manager --on k8s --for hybrid 
cds bind postgresql-db -2 ai-srv-postgresql-db --kind postgresql-db --on k8s --for hybrid 
cds bind html5-apps-repo -2 ai-srv-html5-apps-repo --kind html5-apps-repo --on k8s --for hybrid 