const cfenv = require('cfenv');
const ServiceManager = require('./service-manager.js');
const CisCentral = require('./cis-central.js');
const Destination = require('./destination.js');
const KymaUtils = require('./kyma-utils.js');
const CredStore = require('./credStore.js');
const CfUtils = require('./cf-utils.js');

class TenantAutomator {
    serviceBroker;
    cisCentralName;
    destinationName;

    constructor(tenant, subdomain, custdomain = null) {
        this.tenant = tenant,
        this.subdomain = subdomain
        this.custdomain = custdomain
    }

    async deployTenantArtifacts() {
        await this.initialize();
        await this.createSampleDestination()
        await this.registerBTPServiceBroker();
        await this.cleanUpCreatedServices();
    }

    async undeployTenantArtifacts() {
        await this.initialize();
        await this.deleteSampleDestination()
        await this.unregisterBTPServiceBroker();
        await this.cleanUpCreatedServices();
    }

    async initialize() {
        try {
            this.cisCentral = await this.createCisCentralInstance();
            this.serviceManager = await this.createServiceManager(this.tenant);
            console.log("Automator successfully initialized!")
        } catch (error) {
            console.error("Error: Automation can not be initialized!");
            throw error;
        }
    }

    async createCisCentralInstance() {
        try {
            this.cisCentral = new CisCentral();
            let cisParameters = { grantType: "clientCredentials" };

            // Create new CIS Central instance in SAP BTP
            await this.cisCentral.createServiceInstance(this.cisCentralName, "cis", "central", cisParameters);
            // Create service binding for CIS Central instance
            await this.cisCentral.createServiceBinding();

            console.log("CIS Central Instance has been created successfully!")
            return this.cisCentral;
        } catch (error) {
            console.error("Error: CIS Central Instance can not be created!")
            throw error;
        }
    }

    async createServiceManager(tenant) {
        try {
            // Create service manager using CIS Central instance
            let serviceManagerCredentials = await this.cisCentral.createServiceManager(tenant);

            console.log("Service manager has been created successfully!")
            return new ServiceManager(serviceManagerCredentials);
        } catch (error) {
            console.error("Error: Service Manager can not be created!")
            throw error;
        }
    }
    
    async cleanUpCreatedServices() {
        try {
            // Delete Service Manager from tenant subaccount
            await this.cisCentral.deleteServiceManager(this.tenant);
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
            await this.serviceManager.createServiceBroker(
                this.serviceBroker.name,
                this.serviceBroker.url,
                "Sustainable SaaS API Broker",
                this.serviceBroker.user,
                this.serviceBroker.password
            );
            console.log("Susaas Inbound API Broker registered successfully!")
        } catch (error) {
            console.error("Error: Service broker cannot be registered!")
            console.error(`Error: ${error.message}`);
        }
    }

    async unregisterBTPServiceBroker() {
        try {
            let sb = await this.serviceManager.getServiceBroker(`${this.serviceBroker.name}-${this.tenant}`)
            await this.serviceManager.deleteServiceBroker(sb.id)
            console.log(`Service Broker ${this.serviceBroker.name} deleted`);
        } catch (error) {
            console.error(`Error: Service Broker can not be deleted`);
            console.error(`Error: ${error.message}`);
        }
    }

    async createSampleDestination() {
        try {
            const destName = this.destinationName;
            const destConfig = [{
                "Name": destName,
                "Type": "HTTP",
                "URL": "https://sandbox.api.sap.com",
                "Authentication": "NoAuthentication",
                "Description": "SusaaS S/4HANA Cloud",
                "ProxyType": "Internet",
                "HTML5.DynamicDestination": "true"
            }];
            const destination = new Destination(this.subdomain);
            await destination.createDestination(destConfig)
            console.log(`Sample destination ${destName} is created in tenant subaccount`);
        } catch (error) {
            console.error("Error: Sample destination can not be created in tenant subaccount")
            console.error(`Error: ${error.message}`);
        }
    }
    
    async deleteSampleDestination() {
        try {
            const destName = this.destinationName;
            const destination = new Destination(this.subdomain);
            await destination.deleteDestination(destName)
            console.log(`Sample destination ${destName} is deleted from tenant subaccount`);
        } catch (error) {
            console.error(`Error: Sample destination ${destName} can not be deleted from tenant subaccount`);
            console.error(`Error: ${error.message}`);
        }
    }
}


class Kyma extends TenantAutomator {
    constructor(tenant, subdomain, custdomain){
        try{
            super(tenant, subdomain, custdomain);
            this.serviceBroker = {
                user : process.env["BROKER_USER"],
                password : process.env["BROKER_PASSWORD"],
                url : process.env["BROKER_URL"],
                name : `${process.env["BROKER_NAME"]}-${process.env["KYMA_NAMESPACE"]}`
            }

            this.cisCentralName = `${process.env["HELM_RELEASE"]}-${process.env["KYMA_NAMESPACE"]}-cis-central`
            this.destinationName = `${process.env["HELM_RELEASE"].toUpperCase()}_${process.env["KYMA_NAMESPACE"].toUpperCase()}_S4HANA_CLOUD`
        } catch (error) {
            console.error("Error: Error initializing the automator!")
            throw error;
        }
    }

    async deployTenantArtifacts(){
        try{
            await super.deployTenantArtifacts();
            const kymaUtils = new KymaUtils(this.subdomain, this.custdomain);
            await kymaUtils.createApiRule(kymaUtils.getApiRuleTmpl());
            console.log("Automation: Deployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be deployed!") 
            throw error;
        }
    }

    async undeployTenantArtifacts(){
        try{
            await super.undeployTenantArtifacts();
            const kymaUtils = new KymaUtils(this.subdomain);
            await kymaUtils.deleteApiRule(kymaUtils.getApiRuleTmpl());
            console.log("Automation: Undeployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be undeployed!")
            throw error;
        }
    }

}

class CloudFoundry extends TenantAutomator {

    constructor(tenant, subdomain, custdomain){
        try{
            super(tenant, subdomain, custdomain);

            const { getAppEnv } = cfenv;
            const appEnv = getAppEnv();

            this.serviceBroker = {
                user : null,
                password : null,
                url : process.env.brokerUrl,
                name : `${process.env.brokerName}-${appEnv.app.space_name}`
            }

            this.cisCentralName = `${process.env.appName}-${appEnv.app.space_name}-cis-central`
            this.destinationName = `AISAAS_S4HANA_CLOUD`
            this.credentials = new Map();
            this.cfUtils = new CfUtils();
        } catch (error) {
            console.error("Error: Error initializing the automator!")
            throw error;
        }
    }

    async initialize(){
        try{
            await super.initialize();
            await this.readCredentials();

            let btpAdmin = this.credentials.get("btp-admin-user")
            await this.cfUtils.login(btpAdmin.username, btpAdmin.value);

            console.log("Cloud Foundry login successful!")
        } catch (error) {
            console.error("Error: Cloud Foundry login not successful");
            throw error;
        }
    }

    async deployTenantArtifacts(){
        try {
            await super.deployTenantArtifacts();
            // Don't create route in case of '.' used as tenant separator - wildcard route used!
            process.env.tenantSeparator !== '.' && await this.createRoute();
            console.log("Automation: Deployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be deployed!") 
            throw error;
        }
    }

    async undeployTenantArtifacts(){
        try{
            await super.undeployTenantArtifacts();
            // Don't create route in case of '.' used as tenant separator - wildcard route used!
            process.env.tenantSeparator !== '.' && await this.deleteRoute();
            console.log("Automation: Undeployment has been completed successfully!")
        } catch (error) {
            console.error("Error: Tenant artifacts cannot be undeployed!")
            throw error;
        }
    }

    async createRoute() {
        try {
            await this.cfUtils.createRoute(this.subdomain + process.env.tenantSeparator + process.env.appName, process.env.appName);
        } catch (error) {
            console.error("Error: Route could not be created!")
            throw error;
        }
    }

    async deleteRoute() {
        try {
            await this.cfUtils.deleteRoute(this.subdomain + process.env.tenantSeparator  + process.env.appName, process.env.appName);
        } catch (error) {
            console.error("Error: Route could not be deleted!")
            throw error;
        }
    }

    async readCredentials() {
        try {
            const credStore = new CredStore();
            let btpAdminUser = await credStore.readCredential("aisaas", "password", "btp-admin-user")
            let serviceBroker = await credStore.readCredential("aisaas", "password", "aisaas-broker-credentials")

            this.credentials.set(btpAdminUser.name, btpAdminUser)
            this.credentials.set(serviceBroker.name, serviceBroker)

            this.serviceBroker.user = serviceBroker.username;
            this.serviceBroker.password = serviceBroker.value;
            
            console.log("Credentials retrieved from credential store successfully");
        } catch (error) {
            console.error('Unable to retrieve credentials from cred store, please make sure that they are created! Automation skipped!');
            throw (error);
        }
    }

}

module.exports = process.env.VCAP_APPLICATION ? CloudFoundry : Kyma