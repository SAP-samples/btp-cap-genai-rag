const { OAuthAuthentication, AlertNotificationClient, Severity, Category } = require("@sap_oss/alert-notification-client");
const { Region, Platform } = require("@sap_oss/alert-notification-client/dist/utils/region");
const xsenv = require('@sap/xsenv');
let services, oAuthAuthentication = new Object();

if (cds.env.profiles.find( p =>  p.includes("hybrid") || p.includes("production"))) {
    try{ 
        services = xsenv.getServices({ alertNotification: { label: 'alert-notification' } });
        oAuthAuthentication = new OAuthAuthentication({
            username: services.alertNotification.client_id,
            password: services.alertNotification.client_secret, 
            oAuthTokenUrl: services.alertNotification.oauth_url.split('?')[0]
        }); 
    }catch(error){
        console.log("[cds] - Alert Notification Binding is missing, therefore CAP will not interact with Alert Notification Service");
    }    
}

class AlertNotification {
    constructor() {
        this.bindingExists = this.checkBinding();
    }

    async checkBinding() {
        try {
            xsenv.getServices({ alertNotification: { label: 'alert-notification' } });
            return true;
        } catch (error) {
            return false
        }
    }

    async sendEvent(event) {
        try {
            const client = new AlertNotificationClient({
                authentication: oAuthAuthentication,
                region: new Region(Platform.CF, services.alertNotification.url),  
            }); 
            switch(event.type) {
                case 'GENERIC':
                    return await this.processEventTypeGeneric(client, event.data);
                default : 
                    return await this.processEventDefault(client, event.data); 
            }
        } catch (error) {
            console.error(`Error: An error occured initializing Alert Notification Client`)
            console.error(`Error: ${error.message}`)
        };
    }

    async processEventTypeGeneric(client, data) {
        try{
            const cur_time = Math.floor(+new Date()/ 1000); 
            return await client.sendEvent({
                body: 'Generic event from ' + process.env["APPLICATION_NAME"] + ' application. DETAILS: ' + JSON.stringify(data.body).replace(/[{}]|,/g, "\\"), 
                subject: data.subject, 
                eventType: data.eventType, 
                severity: Severity[data.severity], 
                category: Category[data.category], 
                resource: {
                    resourceName: process.env["APPLICATION_NAME"], 
                    resourceType: 'deployment', 
                    resourceInstance: '1'
                }, 
                eventTimestamp: cur_time, 
                priority: 1
            });
        }catch(error){
            console.error(`Error: An error occurred sending an Alert Notification Event`); 
            console.error(`Error: ${error.message}`)
        }
    }

    async processEventDefault(client, data) { return }
}

module.exports = AlertNotification;