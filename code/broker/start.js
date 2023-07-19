import Broker from '@sap/sbf';

// If VCAP_APPLICATION is defined, we are in a Cloud Foundry scenario
// For local testing, the USER and PASSWORD are always injected via environment variables
if(process.env.VCAP_APPLICATION && cds.env.profiles.find( p =>  p.includes("production"))){ 
    new Broker().start();

}else{
    // In production Kyma scenarios and local testing, BROKER_USER and BROKER_PASSWORD are passed in env variables
    let brokerConfig = { brokerCredentials : { [process.env["BROKER_USER"]] : process.env["BROKER_PASSWORD"] }}
    // For local testing scenario, if SBF_CATALOG is part of environment variables, include it in broker config
    process.env["SBF_CATALOG"] && ( brokerConfig = { ...brokerConfig, catalog : JSON.parse(process.env["SBF_CATALOG"]) } )
    
    new Broker(brokerConfig).start()
}