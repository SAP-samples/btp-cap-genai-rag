const axios = require('axios');
const xsenv = require('@sap/xsenv');
const uaa = require('./token-utils');

let serviceManager = new Object();

if (cds.env.profiles.find( p =>  p.includes("hybrid") || p.includes("production"))) {
    serviceManager = xsenv.getServices({ sm: { label: 'service-manager',  plan : 'subaccount-admin' } }).sm;
}

class CloudManagementCentral{
    constructor() {
        this.uaa = uaa;
        this.tokenStore = new Object();
        this.instanceDetails = new Object();
        this.bindingDetails = new Object();
    }

    async createServiceInstance(serviceName, serviceOffering, servicePlan, parameters) {
        try {
            let body = {
                name: serviceName,
                service_offering_name: serviceOffering,
                service_plan_name: servicePlan,
                parameters: parameters,
                labels: { createdBy: [`susaas-automator`] }
            };
            let token = await this.getToken();
            let optionsInstance = {
                method: 'POST',
                url: serviceManager.sm_url + `/v1/service_instances`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                data: JSON.stringify(body)
            };
            let response = await axios(optionsInstance);
            
            console.log(`Service instance successfully created for ${serviceOffering}-${servicePlan}`);

            // Store instanceData
            this.instanceDetails = response.data;
            return response.data;
        } catch (error) {
            console.error(`Error: Service instance can not be created for ${serviceOffering}-${servicePlan}`);
            throw error;
        }
    }

    async createServiceBinding() {
        try {
            let token = await this.getToken();
            let options = {
                method: 'POST',
                url: serviceManager.sm_url + `/v1/service_bindings`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                data: JSON.stringify({ name: `susaas-automator`, service_instance_id: this.instanceDetails.id })
            };
            let response = await axios(options);

            console.log(`Service binding created for ${this.instanceDetails.id}`);

            // Store instanceData
            this.bindingDetails = response.data;
            return response.data;
        } catch (error) {
            console.error(`Error: Service binding can not be created for ${this.instanceDetails.id}`);
            throw error;
        }
    }

    async deleteServiceInstance() {
        try {
            let token = await this.getToken();
            let optionsInstance = {
                method: 'DELETE',
                url: serviceManager.sm_url + `/v1/service_instances/${this.instanceDetails.id}`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            let response = await axios(optionsInstance);

            console.log(`Service instance ${this.instanceDetails.id} successfully deleted`);
            return response.data;
        } catch (error) {
            console.error(`Error: Service instance can not be deleted`);
            throw error;
        }
    }

    async deleteServiceBinding() {
        try {
            let token = await this.getToken();
            let optionsInstance = {
                method: 'DELETE',
                url: serviceManager.sm_url + `/v1/service_bindings/${this.bindingDetails.id}`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            let response = await axios(optionsInstance);

            console.log(`Service binding ${this.bindingDetails.id} successfully deleted`);
            return response.data;
        } catch (error) {
            console.error(`Error: Service binding can not be deleted`);
            throw error;
        }
    }

    async createServiceManager(tenant) {
        try {
            let credentials = this.bindingDetails.credentials;
            let clientid = credentials.uaa.clientid;
            let clientsecret = credentials.uaa.clientsecret;
            let tokenEndpoint = credentials.uaa.url + '/oauth/token'
            let token = await this.uaa.getTokenWithClientCreds(tokenEndpoint, clientid, clientsecret);

            let authOptions = {
                method: 'POST',
                url: credentials.endpoints.accounts_service_url + `/accounts/v1/subaccounts/${tenant}/serviceManagementBinding`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                data: JSON.stringify({
                    labels: {
                        createdBy: ["susaas-automator"]
                    }
                })
            };
            let response = await axios(authOptions);

            console.log(`Service manager in tenant subaccount ${tenant} successfully created`);
            return response.data;
        } catch (error) {
            console.error(`Error: Service manager can not be created in tenant subaccount ${tenant}`);
            console.error("Error: Broker automation is skipped");
            throw error;
        }
    }

    async deleteServiceManager(tenant) {
        try {
            let credentials = this.bindingDetails.credentials;
            let clientid = credentials.uaa.clientid;
            let clientsecret = credentials.uaa.clientsecret;
            let tokenEndpoint = credentials.uaa.url + '/oauth/token'
            let token = await this.uaa.getTokenWithClientCreds(tokenEndpoint, clientid, clientsecret);

            let authOptions = {
                method: 'DELETE',
                url: credentials.endpoints.accounts_service_url + `/accounts/v1/subaccounts/${tenant}/serviceManagementBinding`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            let response = await axios(authOptions);

            console.log(`Service manager in tenant subaccount ${tenant} successfully deleted`);
            return response.data;
        } catch (error) {
            console.error(`Error: Service manager can not be deleted from tenant subaccount ${tenant}`);
            throw error;
        }
    }

    async getToken() {
        try {
            if (!this.tokenStore.token) {
                this.tokenStore.token = await this.uaa.getTokenWithClientCreds(serviceManager.url + '/oauth/token', serviceManager.clientid, serviceManager.clientsecret);
            }
            return this.tokenStore.token;
        } catch (error) {
            console.error("Error: Unable to get a token for Service Manager");
            throw error;
        }
    }
}

module.exports = CloudManagementCentral