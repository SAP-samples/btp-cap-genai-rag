import Broker from '@sap/sbf';

/**
 * Starts a new Broker instance.
 * 
 * If the VCAP_APPLICATION environment variable is defined, indicating that we're in a Cloud Foundry scenario, 
 * a Broker with no configuration is started. In production Kyma scenarios and local testing, 
 * BROKER_USER and BROKER_PASSWORD environment variables are used to create a broker configuration, 
 * and a Broker with this configuration is started.
 */
if (process.env.VCAP_APPLICATION && process.env.NODE_ENV === "production") {
    new Broker().start();
} else {
    const brokerConfig = {
        brokerCredentials: {
        [process.env["BROKER_USER"]]: process.env["BROKER_PASSWORD"],
        },
    };

    new Broker(brokerConfig).start();
}