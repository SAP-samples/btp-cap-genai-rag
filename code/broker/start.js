import Broker from '@sap/sbf';

// If VCAP_APPLICATION is defined, we are in a Cloud Foundry scenario
// For local testing, the USER and PASSWORD are always injected via environment variables
if(process.env.VCAP_APPLICATION && process.env.NODE_ENV === "production"){ 
    new Broker().start();
}else{
    // In production Kyma scenarios and local testing, BROKER_USER and BROKER_PASSWORD are passed in env variables
    let brokerConfig = { brokerCredentials : { [process.env["BROKER_USER"]] : process.env["BROKER_PASSWORD"] }}    
    new Broker(brokerConfig).start()
}