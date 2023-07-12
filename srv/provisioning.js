const cds = require('@sap/cds');
const xsenv = require('@sap/xsenv');
const AlertNotification = require('./utils/alertNotification');
const Automator = require("./utils/automator");
const executeHttpRequest = require("@sap-cloud-sdk/http-client").executeHttpRequest;
const destinationSelectionStrategies = require("@sap-cloud-sdk/connectivity").DestinationSelectionStrategies;


module.exports = (service) => {

    service.on('UPDATE', 'tenant', async (req, next) => {
        console.log("Subscription data:", JSON.stringify(req.data));

        const { subscribedSubdomain: subdomain, subscribedTenantId : tenant }  = req.data;
        const tenantURL = `https://${subdomain}${process.env.tenantSeparator}${process.env.appDomain}`;
        
        await next();

        // Trigger tenant broker deployment on background
        cds.spawn({ tenant: tenant, subdomain: subdomain }, async (tx) => {
            try {
                let automator = new Automator();
                await automator.deployTenantArtifacts(tenant, subdomain);

                // Get Resource groups 
                try {
                    const response = await executeHttpRequest(
                        { destinationName: 'AI_CORE_API', selectionStrategy: destinationSelectionStrategies.alwaysProvider },
                        { method: 'get', url: `/admin/resourceGroups`, params: {} }
                    )
                    console.log(JSON.stringify(response));
                }catch(error){
                    console.log(`Error message: ${error.message}`)
                }

                console.log("Success: Onboarding completed!");

            } catch (error) {
                const alertNotification = new AlertNotification();

                // Send generic alert using Alert Notification
                alertNotification.sendEvent({
                    type : 'GENERIC',
                    data : {
                        subject : 'Error: Automation skipped because of error during subscription',
                        body : JSON.stringify(error.message),
                        eventType : 'alert.app.generic',
                        severity : 'FATAL',
                        category : 'ALERT'
                    }
                });
                console.error("Error: Automation skipped because of error during subscription");
                console.error(`Error: ${error.message}`);
            }
        })
        return tenantURL;
    });

    service.on('DELETE', 'tenant', async (req, next) => {
        console.log('Unsubscribe Data: ', JSON.stringify(req.data));
        
        const { subscribedSubdomain: subdomain, subscribedTenantId : tenant }  = req.data;

        await next();

        try {
            let automator = new Automator();
            await automator.undeployTenantArtifacts(tenant, subdomain);

            console.log("Success: Unsubscription completed!");
        } catch (error) {
            const alertNotification = new AlertNotification();
                
            // Send generic alert using Alert Notification if service binding exists
            alertNotification.bindingExists ?
                alertNotification.sendEvent({
                    type : 'GENERIC',
                    data : {
                        subject : 'Error: Automation skipped because of error during unsubscription!',
                        body : JSON.stringify(error.message),
                        eventType : 'alert.app.generic',
                        severity : 'FATAL',
                        category : 'ALERT'
                    }
                }) : '';

            console.error("Error: Automation skipped because of error during unsubscription");
            console.error(`Error: ${error.message}`);
        }
        return tenant;
    });


    service.on('upgradeTenant', async (req, next) => {
        await next();

        const { instanceData, deploymentOptions } = cds.context.req.body;
        console.log('UpgradeTenant: ', req.data.subscribedTenantId, req.data.subscribedSubdomain, instanceData, deploymentOptions);
    });


    service.on('dependencies', async (req, next) => {
        let dependencies = await next();

        const services = xsenv.getServices({
            html5Runtime: { tag: 'html5-apps-repo-rt' },
            destination: { tag: 'destination' },
            aicore:  { label: 'aicore' }
        });

        dependencies.push({ xsappname: services.html5Runtime.uaa.xsappname });
        dependencies.push({ xsappname: services.destination.xsappname });
        dependencies.push({ xsappname: services.aicore.appname });

        console.log("SaaS Dependencies:", JSON.stringify(dependencies));
        
        return dependencies;
    });

}