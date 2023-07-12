const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();
const ServiceManager = require("./service-manager");
const CisCentral = require('./cis-central')
const destination = require('./destination')
const CFUtils = require("./cf-utils");
const credStore = require("./credStore");

class TenantAutomator {
    constructor() {
        this.credStore = credStore;
        this.credentials = new Map();
        this.destination = destination;
        this.cf = new CFUtils();
    }

    async deployTenantArtifacts(subscribingSubaccountId, subscribingSubdomain) {
        try {
            await this.initialize(subscribingSubaccountId);
            await this.createSampleDestination(subscribingSubdomain, `SUSAAS_S4HANA_CLOUD`)

            // Don't create route in case of '.' used as tenant separator - wildcard route used!
            process.env.tenantSeparator !== '.' ? await this.createRoute(subscribingSubdomain) : null;

            await this.registerBTPServiceBroker(subscribingSubdomain);
            await this.cleanUpCreatedServices(subscribingSubaccountId);
            console.log("Automation: Deployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be deployed!") 
            throw error;
        }
    }

    async undeployTenantArtifacts(unsubscribingSubaccountId, unsubscribingSubdomain) {
        try {
            await this.initialize(unsubscribingSubaccountId);
            await this.deleteSampleDestination(unsubscribingSubdomain, `SUSAAS_S4HANA_CLOUD`);

            // Don't delete route in case of '.' used as tenant separator - wildcard route used!
            process.env.tenantSeparator !== '.' ? await this.deleteRoute(unsubscribingSubdomain) : null;

            await this.unregisterBTPServiceBroker(unsubscribingSubaccountId);
            await this.cleanUpCreatedServices(unsubscribingSubaccountId);
            console.log("Automation: Undeployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be undeployed!")
            throw error;
        }
    }


    async initialize(subscribingSubdomainId) {
        try {
            await this.readCredentials();
            let btpAdmin = this.credentials.get("btp-admin-user")
            this.cisCentral = await this.createCisCentralInstance(subscribingSubdomainId);
            this.serviceManager = await this.createServiceManager(subscribingSubdomainId);
            await this.cf.login(btpAdmin.username, btpAdmin.value);
            console.log("Automator successfully initialized!")
        } catch (error) {
            console.error("Error: Automation can not be initialized!");
            throw error;
        }
    }

    
    async createCisCentralInstance(subscribingSubdomainId) {
        try {
            this.cisCentral = new CisCentral();
            let cisParameters = { grantType: "clientCredentials" };

            // Create new CIS Central instance in SAP BTP
            await this.cisCentral.createServiceInstance(`${subscribingSubdomainId}-cis-central`, "cis", "central", cisParameters);
            // Create service binding for CIS Central instance
            await this.cisCentral.createServiceBinding();

            console.log("CIS Central Instance has been created successfully!")
            return this.cisCentral;
        } catch (error) {
            console.error("Error: CIS Central Instance can not be created!")
            throw error;
        }
    }

    async createServiceManager(subscribingTenant) {
        try {
            // Create service manager using CIS Central instance
            let serviceManagerCredentials = await this.cisCentral.createServiceManager(subscribingTenant);

            console.log("Service manager has been created successfully!")
            return new ServiceManager(serviceManagerCredentials);
        } catch (error) {
            console.error("Error: Service Manager can not be created!")
            throw error;
        }
    }


    async cleanUpCreatedServices(tenantSubaccountId) {
        try {
            // Delete Service Manager from tenant subaccount
            await this.cisCentral.deleteServiceManager(tenantSubaccountId);
            // Delete CIS Central instance service binding from SAP BTP
            await this.cisCentral.deleteServiceBinding();
            // Delete CIS Central instance from SAP BTP
            await this.cisCentral.deleteServiceInstance();

            console.log("Clean up successfully completed!");
        } catch (error) {
            console.error("Error: Clean up can not be completed!");
            throw error;
        }
    }


    async registerBTPServiceBroker() {
        try {
            let sbCreds = this.credentials.get(`susaas-broker-credentials`);
            let sbUrl = await this.getServiceBrokerUrl();
            await this.serviceManager.createServiceBroker(
                `${process.env.brokerName}-${appEnv.app.space_name}`,
                sbUrl,
                "Sustainable SaaS API Broker",
                sbCreds.username,
                sbCreds.value
            );
            console.log("Susaas Inbound API Broker registered successfully!")
        } catch (error) {
            console.error("Error: Service broker cannot be registered!")
            console.error(`Error: ${error.message}`);
        }
    }


    async readCredentials() {
        try {
            let creds = await Promise.all([
                this.credStore.readCredential("susaas", "password", "btp-admin-user"),
                this.credStore.readCredential("susaas", "password", "susaas-broker-credentials")
            ]);
            creds.forEach((cred) => {
                this.credentials.set(cred.name, cred)
            })
            console.log("Credentials retrieved from credential store successfully");
        } catch (error) {
            console.error('Unable to retrieve credentials from cred store, please make sure that they are created! Automation skipped!');
            throw (error);
        }
    }
    

    async unregisterBTPServiceBroker(subaccountId) {
        try {
            let sb = await this.serviceManager.getServiceBroker(`${process.env.brokerName}-${appEnv.app.space_name}-${subaccountId}`)
            await this.serviceManager.deleteServiceBroker(sb.id)
            console.log(`Service Broker ${process.env.brokerName} deleted`);
        } catch (error) {
            console.error(`Error: Service Broker can not be deleted`);
            console.error(`Error: ${error.message}`);
        }
    }

    async createSampleDestination(subscribedSubdomain, name) {
        try {
            var destConfig = [{
                "Name": name,
                "Type": "HTTP",
                "URL": "https://sandbox.api.sap.com",
                "Authentication": "NoAuthentication",
                "Description": "SusaaS S/4HANA Cloud",
                "ProxyType": "Internet",
                "HTML5.DynamicDestination": "true"
            }];
            await this.destination.subscriberCreate(subscribedSubdomain, destConfig)
            console.log(`Sample destination ${name} is created in tenant subaccount`);
        } catch (error) {
            console.log("Error: Sample destination can not be created in tenant subaccount")
            console.error(`Error: ${error.message}`);
        }
    }
    
    async deleteSampleDestination(unsubscribingSubdomain, name) {
        try {
            await this.destination.subscriberDelete(unsubscribingSubdomain, name)
            console.log(`Sample destination ${name} is deleted from tenant subaccount`);
        } catch (error) {
            console.log(`Error: Sample destination ${name} can not be deleted from tenant subaccount`);
            console.error(`Error: ${error.message}`);
        }
    }

    async createRoute(subscribedSubdomain) {
        try {
            await this.cf.createRoute(subscribedSubdomain + process.env.tenantSeparator + process.env.appName, process.env.appName);
        } catch (error) {
            console.error("Error: Route could not be created!")
            throw error;
        }
    }

    async deleteRoute(unsubscribedSubdomain) {
        try {
            await this.cf.deleteRoute(unsubscribedSubdomain + process.env.tenantSeparator  + process.env.appName, process.env.appName);
        } catch (error) {
            console.error("Error: Route could not be deleted!")
            throw error;
        }
    }

    async getServiceBrokerUrl() {
        try {
           console.log("Broker endpoint to be registered:", process.env.brokerUrl);
           return process.env.brokerUrl;
        } catch (error) {
            console.error("Error: Service Broker URL could not be retrieved!")
            throw error;
        }
    }
}

module.exports = TenantAutomator;